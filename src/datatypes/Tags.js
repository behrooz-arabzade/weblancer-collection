let Sequelize = require('sequelize');
const {DataTypes} = Sequelize;

module.exports.define = function define(Sequelize) {
}

module.exports.TAGS = DataTypes.ARRAY(DataTypes.STRING);