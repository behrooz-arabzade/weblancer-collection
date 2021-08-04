const Sequelize = require('sequelize');

const Config = (sequelize, DataTypes) => {
    const Config = sequelize.define('config', {
        id: {
            type: DataTypes.BIGINT,
            unique: true,
            autoIncrement: true,
            primaryKey: true
        },
        key: {
            type: DataTypes.STRING,
            unique: true,
        },
        value: {
            type: DataTypes.JSON,
            defaultValue: {}
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
        }
    });
    
    return Config;
};

module.exports = Config;