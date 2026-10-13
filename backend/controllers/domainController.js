const IndustrySchema = require('../models/IndustrySchema');

// @desc    Get all schemas (all modules) for a specific industry
// @route   GET /api/domain/schema/:industryId
// @access  Private
exports.getSchemasByIndustry = async (req, res) => {
  try {
    const { industryId } = req.params;
    const schemas = await IndustrySchema.find({ industryId });
    res.json(schemas);
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).json({ message: 'Server error fetching schemas' });
  }
};

// @desc    Update or Create schema for a specific industry and module
// @route   PUT /api/domain/schema/:industryId/:moduleKey
// @access  Private/Admin
exports.updateSchema = async (req, res) => {
  try {
    const { industryId, moduleKey } = req.params;
    const { fields } = req.body;

    if (!Array.isArray(fields)) {
      return res.status(400).json({ message: 'Fields must be an array' });
    }

    // Find and update or create if not exists
    const schema = await IndustrySchema.findOneAndUpdate(
      { industryId, moduleKey },
      { fields },
      { new: true, upsert: true }
    );

    res.json(schema);
  } catch (error) {
    console.error('Error updating schema:', error);
    res.status(500).json({ message: 'Server error updating schema' });
  }
};
