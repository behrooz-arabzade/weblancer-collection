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
        test: {
            type: DataTypes.String,
        }
    });
    
    return Config;
};

module.exports = Config;