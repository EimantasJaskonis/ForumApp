import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { getDb } from '../index.js';


// Registracijos funkcija, kuria sukuriu naują vartotoją

export const registerUser = async (req, res) => {
  try {
    const db = await getDb(); // Gaunu duomenų bazę
    const users = db.collection('users'); // Pasirinkiu vartotojų kolekciją
    const { name, email, password } = req.body; // Išskleidžiu duomenis iš užklausos kūno

    const existing = await users.findOne({ email }); // Patikrinu, ar vartotojas su tokiu el. paštu jau egzistuoja
    if (existing) {
      console.log('User already exists:', email);
    return res.status(400).json({ message: 'User already exists' });
    };

    // Šifruoju slaptažodį, kad jis būtų saugus
    
    const hashed = await bcrypt.hash(password, 10); 
    const newUser = {
      _id: uuidv4(),
      name,
      email,
      password: hashed,
      createdAt: new Date().toISOString(),
    };

     await users.insertOne(newUser); // Įterpiu naują vartotoją į duomenų bazę

     // Sukuriu JWT token, kuris bus naudojamas vartotojo autentifikacijai

     const token = jwt.sign(
      { id: newUser._id, name: newUser.name, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Prisijungimo funkcija, kuria leidžiu vartotojui prisijungti su el. paštu ir slaptažodžiu

export const loginUser = async (req, res) => {
  try {
    const db = await getDb();
    const users = db.collection('users');
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    const user = await users.findOne({ email: email });
    console.log('User found:', user); // Ar vartotojas rastas?
    if (!user) {
     console.log(`User not found: ${email}`);
     return res.status(404).json({ message: 'User not found' });
    }

    console.log('Stored hash:', user.password);
    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match); // Ar slaptažodis teisingas?
    if (!match) {
     console.log('Invalid password for user:', email);
     return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Sukuriu JWT token, jei vartotojas rastas ir slaptažodis teisingas

    const token = jwt.sign ({ id: user._id, name: user.name, email: user.email }, 
    process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('Login successful for user:', email);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Atnaujinu vartotojo profilį, leidžiu keisti vardą ir el. paštą

export const updateProfile = async (req, res) => {
  try {
    const db = await getDb(); // Sukuriu DB objektą
    const users = db.collection('users'); // Pasirinkiu vartotojų kolekciją
    const { name, email } = req.body; // Gaunu vartotojo duomenis iš requesto
    const userId = req.user.id; // Išgaunu vartotojo ID iš autentifikacijos informacijos

    // Patikrinu ar email jau naudojamas ar ne

    const existing = await users.findOne({ email, _id: { $ne: userId } });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    // Atlieku vartotojo duomenų atnaujinimą

    const result = await users.updateOne(
      { _id: userId },
      { $set: { name, email } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Patikrinu, ar atnaujinimas įvyko

    const updatedUser = await users.findOne({ _id: userId });
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    });

  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const db = await getDb(); // Sukuriu DB objektą
    const users = db.collection('users'); // Pasirinkiu vartotojų kolekciją
    const { currentPassword, newPassword } = req.body; // Išskleidžiu slaptažodžius iš užklausos kūno
    const userId = req.user.id; // Išgaunu vartotojo ID iš autentifikacijos informacijos
    console.log(`Password update attempt for user: ${userId}`);

    // Randu vartotoją
    
    const user = await users.findOne({ _id: userId });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('User found:', user.email);
    console.log('Comparing passwords...');

    // Palyginu dabartinį slaptažodį su saugomu slaptažodžiu

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      console.log('Password comparison failed');
      return res.status(401).json({ message: 'Invalid current password' });
    }
    console.log('Password matched, hashing new password...');

    // Šifruoju naują slaptažodį

    const hashed = await bcrypt.hash(newPassword, 10); 
    console.log('Updating password in database...');

    // Atlieku slaptažodžio atnaujinimą duomenų bazėje

    const result = await users.updateOne(
      { _id: userId },
      { $set: { password: hashed } }
    );
    console.log('Update result:', result);

    if (result.modifiedCount === 0) {
      console.log('No documents modified');
      return res.status(500).json({ message: 'Password not updated' });
    }
    console.log('Password updated successfully');
    res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
