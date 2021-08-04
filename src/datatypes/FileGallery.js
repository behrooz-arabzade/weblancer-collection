let Sequelize = require('sequelize');
const {DataTypes} = Sequelize;

module.export.define = function define(Sequelize) {
}

module.export.FILEGALLERY = DataTypes.ARRAY(DataTypes.FILE);