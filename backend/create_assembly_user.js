const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Organization = require('./models/Organization');

async function createOrUpdateAssemblyUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('MongoDB connected successfully');

    // Find the primary organization
    let org = await Organization.findOne();
    if (!org) {
      console.log('Creating default organization...');
      org = await Organization.create({
        name: 'TrackBells Automation',
        code: 'TB-01',
        industry: 'Manufacturing',
        subIndustry: 'Drag Chain'
      });
    }

    const email = 'assembly@cmh.com';
    const oldEmail = 'assembly@trackbells.com';
    const password = process.env.ASSEMBLY_USER_PASSWORD;
    if (!password) throw new Error('Set ASSEMBLY_USER_PASSWORD in backend/.env first');
    const name = 'Assembly & Packaging Officer';
    const role = 'assembly_user';

    let user = await User.findOne({ $or: [{ email }, { email: oldEmail }] });
    if (user) {
      console.log(`Found existing user for ${email}, updating role and password...`);
      user.name = name;
      user.email = email;
      user.role = role;
      user.department = 'Assembly & Packaging';
      user.password = password; // Will be hashed by pre-save hook
      user.organizationId = org._id;
      user.isActive = true;
      user.permissions = ['assembly', 'dispatch', 'store_manager', 'sales', 'orders'];
      await user.save();
      console.log('✅ Assembly User successfully updated!');
    } else {
      console.log(`Creating new Assembly User: ${email}...`);
      user = await User.create({
        name,
        email,
        password,
        role,
        department: 'Assembly & Packaging',
        organizationId: org._id,
        isActive: true,
        permissions: ['assembly', 'dispatch', 'store_manager']
      });
      console.log('✅ Assembly User successfully created!');
    }

    console.log('----------------------------------------------------');
    console.log('Credentials for Assembly User:');
    console.log('Email:    ' + email);
    console.log('Password: ' + password);
    console.log('Role:     ' + role);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Error creating Assembly User:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createOrUpdateAssemblyUser();
