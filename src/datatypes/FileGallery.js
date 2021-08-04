let Sequelize = require('sequelize');
const {DataTypes} = Sequelize;

module.exports.define = function define(Sequelize) {
}

module.exports.FILEGALLERY = DataTypes.ARRAY(DataTypes.FILE);