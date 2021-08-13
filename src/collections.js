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

    let query = "SELECT * FROM collections";
    if (groupId) {
        query = `${query} WHERE groupId = '${groupId}'`
    }

    _sequelize = new Sequelize(
        dbName,
        dbUser,
        dbPassword,
        {
            host:  "localhost",
            dialect: 'postgres',
        },
    );

    let allCollections = [];
    try {
        allCollections = await _sequelize
            .query(`${query};`, { type: QueryTypes.SELECT });
    } catch (err) {
        console.log("error", err)
    }

    console.log("allCollections", allCollections.length)
    let modelMap = {};
    let newAllCollections = JSON.parse(JSON.stringify(allCollections));
    for(const collection of newAllCollections) {
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

    let {success, error} = await resolveMigrations(_sequelize);

    _sequelize = new Sequelize(
        dbName,
        dbUser,
        dbPassword,
        {
            host:  "localhost",
            dialect: 'postgres',
        },
    );

    modelMap = {};
    newAllCollections = JSON.parse(JSON.stringify(allCollections));
    for(const collection of newAllCollections) {
        modelMap[collection.name] =
            define(_sequelize, collection.name, collection.schema, collection.relation);
    }

    _models = {
        collection: Collection(_sequelize, DataTypes),
        config: Config(_sequelize, DataTypes),
        ...modelMap
    };

    // Resolving assosiations
    allModels = {};
    Object.values(_models).forEach(model => {
        allModels[model.name] = model;
    });
    Object.values(_models).forEach(model => {
        if (model.associate)
            model.associate(allModels);
    });

    await _sequelize.sync();

    console.log("initCollections test");
    await _sequelize.models.collection.findOne({
        where: {
            name: "sanaz"
        }
    });

    return {success, error, models: _models, sequelize: _sequelize};
}

async function initSandBox (sandbox) {
    try{
        console.log("initSandBox 1")
        try{
            let query = `SELECT "id", "key", "value" FROM "configs" AS "config" WHERE "config"."key" = 'sandBoxInitialized'`;
            let config = await _sequelize
                .query(`${query};`, { type: QueryTypes.SELECT });
            // let config = await _sequelize.models.config.findOne({
            //     where: { key: 'sandBoxInitialized' }
            // });

            console.log("initSandBox 2", config)
            if (config.length > 0)
                return {success: true};
        } catch (error) {
            console.log("initSandBox 3", error)
            return {
                success: false,
                error, errorStatusCode: 500
            }
        }

        console.log("initSandBox 4")

        for (const collection of (sandbox.collections || [])) {
            let query = `SELECT * FROM "collections" WHERE "collections"."name" = '${collection.name}'`;
            let collections = await _sequelize
                .query(`${query};`, { type: QueryTypes.SELECT });

            console.log("initSandBox 4.5", collection.name, collections);
            if (collections.length > 0) {
                continue;
            }
            let newCollection = {...collection};
            await _sequelize.models.collection.create(newCollection);
        }

        console.log("initSandBox 5")
        let {success, error} = await updateCollections();

        console.log("initSandBox 6")
        if (!success) {
            return {
                success: false,
                error, errorStatusCode: 500
            }
        }

        console.log("initSandBox 7")
        try {
            let keys =  Object.keys(sandbox);

            for (let i = 0; i < keys.length; i++) {
                if (keys[i] === "collections")
                    continue;

                let collectionName = keys[i];
                let collection = sandbox.collections.find(c => c.name === collectionName);

                if (!collection)
                    continue;

                let records = sandbox[collectionName];

                records.forEach(record => {
                    delete record.id;
                    let props = Object.keys(record);
                    for (const prop of props) {
                        if (!Object.keys(collection.schema).includes(prop)) {
                            delete record[prop];
                            continue;
                        }

                        if (collection.schema[prop].weblancerType === "video" ||
                            collection.schema[prop].weblancerType === "audio" ||
                            collection.schema[prop].weblancerType === "image" ||
                            collection.schema[prop].weblancerType === "document" ||
                            collection.schema[prop].weblancerType === "object")
                        {
                            record[prop] = JSON.stringify(record[prop]);
                        }
                    }
                });

                console.log("initSandBox 7.5", records);
                await _sequelize.models[collectionName].bulkCreate(records, {
                    ignoreDuplicates: true
                });
            }

            console.log("initSandBox 8")
            await _sequelize.models.config.create({
                key: "sandBoxInitialized",
                value: {value: true}
            });

            console.log("initSandBox 9")
            return {success: true};
        } catch (error) {
            console.log("initSandBox error 1", error)
            return {success: false, error, errorStatusCode: 500};
        }
    } catch (error) {
        console.log("initSandBox error 2", error)
        return {success: false, error, errorStatusCode: 500};
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
        collection = await _sequelize.models.collection.findOne({
            where: {
                name: collectionName
            }
        });

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

    let schema = JSON.parse(Json.stringify(collection.schema));

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
