const getDataType = require('./datatypes/getDataType');

module.exports = function define (sequelize, name, schema, relations) {
    let tempSchema = {...schema}
    Object.keys(tempSchema).forEach(key => {
        if (schema[key].isRelation) {
            delete schema[key];
        }
        if (schema[key] === undefined) {
            delete schema[key];
        }
    });

    console.log("define 1", name, schema);
    Object.values(schema).forEach(field => {
        field.type = getDataType(field.weblancerType);
        delete field.weblancerType;
        delete field.name;
        delete field.description;
        delete field.options;
        delete field.order;
        delete field.isRelation;
    });
    console.log("define 2", name, schema);

    let model = sequelize.define(name, schema);

    model.associate = function (models) {
        for(const relation of relations) {
            if (relation.type === "single") {
                models[name].belongsTo(models[relation.target]);
            }
            if (relation.type === "multi") {
                models[name].hasMany(models[relation.target], {as: relation.name});
            }
        }
    }

    return model;
}
