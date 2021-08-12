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

    Object.keys(schema).forEach(key => {
        let field = schema[key];

        field.type = getDataType(field.weblancerType);

        if (field.weblancerType === "array") {
            field.get = function() {
                return JSON.parse(this.getDataValue(key));
            };
            field.set = function(val) {
                return this.setDataValue(key, JSON.stringify(val));
            };
        }

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
        if (relations) {
            for(const relation of relations) {
                if (relation.type === "single") {
                    models[name].belongsTo(models[relation.target]);
                }
                if (relation.type === "multi") {
                    models[name].hasMany(models[relation.target], {as: relation.name});
                }
            }
        }
    }

    return model;
}
