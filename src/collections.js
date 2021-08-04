const { Client } = require('pg')
const Sequelize = require('sequelize');
const { QueryTypes } = require('sequelize');
const define = require('./define');
const collectionManager = require('./manager');
const Collection = require('./schema/collection');

collectionManager.addWeblancerDataTypes(Sequelize);

let _sequelize;
let _models;



async function initCollections (dbName, dbUser, dbPassword, dbHost, groupId) {
    dbName = dbName.toLowerCase();

    const pgClient = new Client();
    await pgClient.connect();

    let res = await pgClient
        .query(`SELECT FROM pg_database WHERE datname = '${dbName}'`);

    if (res.rowCount === 0) {
        res = await pgClient
            .query(`CREATE DATABASE ${dbName}`);
        
        console.log(res);
    }
    
    await pgClient.end();

    _sequelize = new Sequelize(
        dbName,
        dbUser,
        dbPassword,
        {
            host:  dbHost || "localhost",
            dialect: 'postgres',
        },
    );

    let query = "SELECT * FROM collections";
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