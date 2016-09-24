/*index router defined*/
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wchat');
exports.User = mongoose.model('User', require('./user'));
