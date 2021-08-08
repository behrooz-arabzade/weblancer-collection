const getDataType = require('./datatypes/getDataType');

module.exports = function define (sequelize, name, schema, relations) {
    let tempSchema = {...schema}
    Object.keys(tempSchema).forEach(key => {
        if (schema[key.isRelation]) {
            delete schema[key];
        }
    });

    schema.type = getDataType(schema.weblancerType);

    Object.values(schema).forEach(field => {
        delete field.weblancerType;
        delete field.name;
        delete field.description;
        delete field.options;
        delete field.order;
        delete field.isRelation;
    });

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
