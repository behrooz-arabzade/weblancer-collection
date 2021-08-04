const Sequelize = require('sequelize');

const Collection = (sequelize, DataTypes) => {
    const Collection = sequelize.define('collection', {
        id: {
            type: DataTypes.BIGINT,
            unique: true,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            unique: true,
        },
        displayName: {
            type: DataTypes.STRING,
        },
        description: {
            type: DataTypes.STRING
        },
        groupId: {
            type: DataTypes.STRING
        },
        schema: {
            type: DataTypes.JSON
        },
        relations: {
            type: DataTypes.JSON
        },
        created_at: {
            type: 'TIMESTAMP',
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            allowNull: false
        },
        updated_at: {
            type: 'TIMESTAMP',
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            allowNull: false
        }
    });
    
    return Collection;
};

module.exports = Collection;