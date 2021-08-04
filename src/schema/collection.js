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
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('NOW()')
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('NOW()')
        }
    });
    
    return Collection;
};

module.exports = Collection;