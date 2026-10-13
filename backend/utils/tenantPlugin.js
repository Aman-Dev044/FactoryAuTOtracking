const tenantContext = require('../middleware/tenantContext');

module.exports = function tenantPlugin(schema) {
  // Add organizationId to every schema this plugin is applied to
  schema.add({
    organizationId: {
      type: require('mongoose').Schema.Types.ObjectId,
      ref: 'Organization',
      required: false
    }
  });

  // Helper to inject organizationId into query conditions
  const setTenantFilter = function () {
    const orgId = tenantContext.getStore();
    if (orgId) {
      this.where({ organizationId: orgId });
    }
  };

  // Hooks for queries
  schema.pre('find', setTenantFilter);
  schema.pre('findOne', setTenantFilter);
  schema.pre('count', setTenantFilter);
  schema.pre('countDocuments', setTenantFilter);
  schema.pre('findOneAndUpdate', setTenantFilter);
  schema.pre('updateMany', setTenantFilter);
  schema.pre('updateOne', setTenantFilter);
  schema.pre('deleteOne', setTenantFilter);
  schema.pre('deleteMany', setTenantFilter);

  // Hook for saving documents (ensure organizationId is set upon creation)
  schema.pre('save', function () {
    if (this.isNew) {
      const orgId = tenantContext.getStore();
      if (orgId && !this.organizationId) {
        this.organizationId = orgId;
      }
    }
  });
};

