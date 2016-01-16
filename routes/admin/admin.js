/* jshint node: true */
/* jshint esnext: true */
'use strict';

const Q = require('q');
const router = require('express').Router();
const accesscontrol = require('../../acl/accesscontrol');
const isAuthenticated = require('../../acl/authentication');
const participants = require('../../service/participants');
const participant = require('../../domain/participant');
const editUrlGenerator = require('../../domain/editUrlGenerator');
const costCalculator = require('../../domain/costCalculator');

let canViewAdminPage = function (role) {
  return accesscontrol.hasPermissionTo(role, 'view admin page');
}

router.get('/', isAuthenticated, (req, res) => {
  if (canViewAdminPage(req.user.role)) {
    var admininfo = require('../../domain/admininfo');
    admininfo.getShirtOrders().then(orders =>
        res.render('admin', {orders, isAdmin: true}));
  } else {
    res.render('error', {
      message: 'Bitte anmelden',
      error: {
        status: 'Nur Administratoren können diese Seite einsehen'
      }
    });
  }
});

let addEditUrlTo = function (participants) {
  participants.map(participant => {
    participant.editUrl = editUrlGenerator.generateEncryptedUrl(participant.id.toString());
    return participant;
  });
};

let addAmountTo = function (participants) {
  participants.map(function(participant) {
    participant.amount = costCalculator.priceFor(participant);
    return participant;
  });
};


router.get('/participants', isAuthenticated, (req, res) => {
  participants.getConfirmed().then(result => {
    var allParticipants = result;
    participants.getRegistered().then(result => {
      allParticipants = allParticipants.concat(result);
      addEditUrlTo(allParticipants);
      Q.all(allParticipants.map(participant.addTshirtDetailsTo))
        .then(() => {
            addAmountTo(allParticipants);
            res.render('admin/list', {participants: allParticipants, isAdmin: true});
          }
        );
    });
  });

});

module.exports = router;
