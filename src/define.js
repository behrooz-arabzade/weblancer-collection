module.exports = function define (sequelize, name, schema, relations) {
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