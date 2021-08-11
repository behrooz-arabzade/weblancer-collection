const { Client } = require('pg')
const Sequelize = require('sequelize');
const { QueryTypes } = require('sequelize');
const getDataType = require('./datatypes/getDataType');
const define = require('./define');
const { resolveMigrations } = require('./manager');
const collectionManager = require('./manager');
const Collection = require('./schema/collection');
const Config = require('./schema/config');
const {DataTypes} = Sequelize;

collectionManager.addWeblancerDataTypes(Sequelize);

let _sequelize;
let _models;

let _dbName;
let _dbUser;
let _dbPassword;
let _groupId;
let _dbHost;
let _dbPort;

async function initCollections (dbName, dbUser, dbPassword, groupId, dbHost, dbPort) {
    dbName = dbName.toLowerCase();

    _dbName = dbName;
    _dbUser = dbUser;
    _dbPassword = dbPassword;
    _groupId = groupId;
    _dbHost = dbHost;
    _dbPort = dbPort;

    // Creating db if not exist
    try {
        let pgConfig = {
            user: dbUser,
            password: dbPassword,
        };
        dbHost && (pgConfig.host = dbHost);
        dbPort && (pgConfig.port = dbPort);
        const pgClient = new Client(pgConfig);
        await pgClient.connect();

        const isDbExist = async () => {
            let res = await pgClient.query(`SELECT FROM pg_database WHERE datname = '${dbName}'`);
            return res.rowCount > 0;
        }

        if (!await isDbExist()) {
            await pgClient
                .query(`CREATE DATABASE ${dbName}`);
        }

        await pgClient.end();
    } catch (error) {
        return {
            success: false,
            error: "Can't connect to the database"
        }
    }
    // Creating db if not exist

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

    let allCollections = [];
    try {
        allCollections = await _sequelize
            .query(`${query};`, { type: QueryTypes.SELECT });
    } catch (err) {
        console.log("error", err)
    }

    let modelMap = {};
    for(const collection of allCollections) {
        modelMap[collection.name] =
            define(_sequelize, collection.name, collection.schema, collection.relation);
    }

    _models = {
        collection: Collection(_sequelize, DataTypes),
        config: Config(_sequelize, DataTypes),
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

    await _sequelize.sync();

    let {success, error} = await resolveMigrations(_sequelize);

    return {success, error, models: _models, sequelize: _sequelize};
}

async function initSandBox (sandbox) {
    let config = await _sequelize.models.config.findOne({
        where: {
            key: "initialized"
        },
        attributes: ["id", "key", "value"]
    });

    if (config)
        return {success: true};

    for (const collection of (sandbox.collections || [])) {
        let newCollection = {...collection};
        await _sequelize.models.collection.create(newCollection);
    }

    let {success, error} = await updateCollections();

    if (!success) {
        return {
            success: false,
            error
        }
    }

    try {
        let keys =  Object.keys(sandbox);

        for (let i = 0; i < keys.length; i++) {
            if (keys[i] === "collections")
                continue;

            let collectionName = keys[i];
            let records = sandbox[collectionName];

            await _sequelize.models[collectionName].bulkCreate(records);
        }

        return {success: true};
    } catch (error) {
        return {success: false, error};
    }
}

async function updateCollections() {
    return await initCollections(_dbName, _dbUser, _dbPassword, _groupId, _dbHost, _dbPort);
}

async function createCollection(name, displayName, description, groupId, metadata, isApp) {
    let checkName = async (name, tryTime = 1) => {
        try {
            let sameCollection = await models.instance.findOne({
                where: {
                    name
                }
            });

            if (sameCollection) {
                if (!isApp) {
                    return false;
                }

                return `${name}_${tryTime}`;
            }

            return name;
        } catch(error) {
            console.log("route create error", error);
            return false;
        }
    }

    name = name.toLowerCase();

    let nameChecked = false;
    let tryTime = 1;
    while (!nameChecked) {
        let newName = await checkName(name, tryTime);

        if (!newName) {
            return {
                success: false,
                error: "Name is not acceptable, try another one",
                errorStatusCode: 409
            };
        }

        if (name === newName) {
            break;
        }

        tryTime++;
    }

    let newCollection = {
        name, displayName, description, groupId, metadata
    };

    newCollection.schema = {
        id : {
            type: DataTypes.BIGINT,
            unique: true,
            autoIncrement: true,
            primaryKey: true,
            order: 0,
            name: "id",
            description: "This field generate automatically from weblancer",
        }
    };

    await models.instance.collection.create(newCollection);

    return {
        success: true,
        collections: await models.instance.collection.findAll().toJSON()
    };
}

async function updateCollection(collectionName, displayName, description, groupId, metadata) {
    let collection;
    try {
        collection = await models.instance.collection.findOne({
            where: {
                name: collectionName
            }
        })

        if (!collection) {
            return {
                success: false,
                error: "Collection not found",
                errorStatusCode: 404
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            errorStatusCode: 500
        }
    }

    await collection.update({
        displayName,
        description,
        groupId,
        metadata: {...collection.metadata, ...metadata}
    })

    return {
        success: true,
        collection
    }
}

async function getCollection(collectionName) {
    let collection;
    try {
        collection = await models.instance.collection.findOne({
            where: {
                name: collectionName
            }
        })

        if (!collection) {
            return {
                success: false,
                error: "Collection not found",
                errorStatusCode: 404
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            errorStatusCode: 500
        }
    }

    return {
        success: true,
        collection
    }
}

async function getAllCollections() {
    try {
        let collections = await models.instance.collection.findAll()

        return {
            success: true,
            collections
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            errorStatusCode: 500
        }
    }
}

async function updateSchema(collectionName, schema) {
    let collection;
    try {
        collection = await models.instance.collection.findOne({
            where: {
                name: collectionName
            }
        })

        if (!collection) {
            return {
                success: false,
                error: "Collection not found",
                errorStatusCode: 404
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            errorStatusCode: 500
        }
    }

    let oldSchema = {...collection.schema};

    await collection.update({schema});

    let {success, error} = await updateCollections();

    if (!success) {
        await collection.update({schema: oldSchema});

        return {
            success: false,
            error
        }
    }

    return {
        success: true,
        collection
    }
}

async function addField(collectionName, name, key, type, description, options) {
    let collection;
    try {
        collection = await models.instance.collection.findOne({
            where: {
                name: collectionName
            }
        })

        if (!collection) {
            return {
                success: false,
                error: "Collection not found",
                errorStatusCode: 404
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            errorStatusCode: 500
        }
    }

    if (!getDataType(type)) {
        return {
            success: false,
            error: "Type not found",
            errorStatusCode: 404
        }
    }

    let schema = collection.schema;

    if (schema[key]) {
        return {
            success: false,
            error: "Key exist in collection, try another key",
            errorStatusCode: 409
        }
    }

    schema[key] = {
        name,
        description,
        options,
        weblancerType: type,
        order: Object.keys(schema).length
    }

    await collection.update({schema});

    let {success, error} = await updateCollections();

    if (!success) {
        delete schema[key];

        await collection.update({schema});

        return {
            success: false,
            error
        }
    }

    return {
        success: true,
        collection
    }
}

async function updateField(collectionName, name, key, type, description, options) {
    let collection;
    try {
        collection = await models.instance.collection.findOne({
            where: {
                name: collectionName
            }
        })

        if (!collection) {
            return {
                success: false,
                error: "Collection not found",
                errorStatusCode: 404
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            errorStatusCode: 500
        }
    }

    if (!getDataType(type)) {
        return {
            success: false,
            error: "Type not found",
            errorStatusCode: 404
        }
    }

    let schema = collection.schema;

    if (!schema[key]) {
        return {
            success: false,
            error: "Key not found",
            errorStatusCode: 404
        }
    }

    let oldSchemaKey = {...schema[key]};

    schema[key] = {
        type: getDataType(type),
        name,
        description,
        options,
        weblancerType: type
    }

    await collection.update({schema});

    let {success, error} = await updateCollections();

    if (!success) {
        schema[key] = {...oldSchemaKey};

        await collection.update({schema});

        return {
            success: false,
            error
        }
    }

    return {
        success: true,
        collection
    }
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

module.exports = {
    initCollections,
    sequelize,
    models,
    DataTypes,
    updateCollections,
    createCollection,
    updateCollection,
    getAllCollections,
    getCollection,
    updateSchema,
    addField,
    updateField,
    initSandBox
};
