const Sequelize = require('sequelize');
const { QueryTypes } = require('sequelize');
const define = require('./define');
const collectionManager = require('./manager');
const Collection = require('./schema/collection');

collectionManager.addWeblancerDataTypes(Sequelize);

let _sequelize;
let _models;

async function initCollections (dbname, groupId) {
    _sequelize = new Sequelize(
        dbname,
        process.env.DATABASE_USER,
        process.env.DATABASE_PASSWORD,
        {
            host:  process.env.POSTGRES_HOST || "localhost",
            dialect: 'postgres',
        },
    );

    let query = "SELECT * FROM collections WHERE";
    if (groupId) {
        query = `${query} WHERE groupId = '${groupId}'`
    }

    const allCollections = await _sequelize
        .query(`${query};`, { type: QueryTypes.SELECT });

    let modelMap = {};
    for(const collection of allCollections) {
        modelMap[collection.name] = 
            define(_sequelize, collection.name, collection.schema, collection.relation); 
    }

    _models = {
        collection: Collection(_sequelize, DataTypes),
        ...modelMap
    };

    // Resolving assosiations
    let allModels = {};
    Object.values(_models).forEach(model => {
        allModels[model.name] = model;
    });
    Object.values(_models).forEach(model => {
        if (model.associate)
            model.associate(allModels);
    });
    // Resolving assosiations

    await _sequelize.sync({
        // logging: false,
        alter: true
    })

    return {models: _models, sequelize: _sequelize};
}

const sequelize = {
    get instance() {
        return _sequelize;
    }
};

const models = {
    get instance() {
        return _models;
    }
};

module.exports = {initCollections, sequelize, models};