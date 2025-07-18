import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../index.js';

// Gaunu visus klausimus su vartotojų informacija, puslapiavimas, paieška, filtravimas ir rųšiavimas

export const getAllQuestions = async (req, res) => {
  try {
    const db = await getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const { search, filter, sort } = req.query;
    
    let query = {};
    
    // Paieška

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (req.query.tag) {
      query.tags = req.query.tag;
    }

    // Filtravimas

    if (filter && typeof filter === 'string') {
      const normalizedFilter = filter.toLowerCase();
      
      if (normalizedFilter === 'answered') {
        query.answerCount = { $gt: 0 };
      } else if (normalizedFilter === 'unanswered') {
        query.answerCount = { $eq: 0 };
      }
    }
    
    // Rūšiavimas

    let sortOption = { createdAt: -1 };
    
    if (sort && typeof sort === 'string') {
      const normalizedSort = sort.toLowerCase();
      
      if (normalizedSort === 'popular') {
        sortOption = { 
          answerCount: -1,
          createdAt: -1
        };
      }
    }
    
    // Gaunu klausimus su vartotojų informacija
    // Naudoju MongoDB agregaciją su $lookup, kad prijungčiau vartotojų informaciją

    const questions = await db.collection('questions').aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $match: query },
      { $sort: sortOption },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          question: 1,
          createdAt: 1,
          updatedAt: 1,
          likes: 1,
          dislikes: 1,
          answerCount: 1,
          userName: "$user.name",
          userId: 1
        }
      }
    ]).toArray();

    // Skaičiuoju bendrą klausimų kiekį pagal užklausą

    const total = await db.collection('questions').countDocuments(query);  
      
    // Pridedu atsakymus prie kiekvieno klausimo

     for (const question of questions) {
      const answers = await db.collection('answers').aggregate([ 
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: "$user" },
        { $match: { questionId: question._id } },
        {
          $project: {
            _id: 1,
            answer: 1,
            createdAt: 1,
            updatedAt: 1,
            userName: "$user.name",
            userId: 1
          }
        }
      ]).toArray();
      
      question.answers = answers;
    }
      
    // Grąžinu klausimus su puslapiavimu ir bendru skaičiumi

    res.status(200).json({
      questions, 
      total, 
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error getting questions:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Sukuriu naują klausimą

export const createQuestion = async (req, res) => {
  try {
    const db = await getDb();
    const newQuestion = {
      _id: uuidv4(),
      userId: req.user.id, // Naudoju prisijungusio vartotojo ID
      question: req.body.question,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      answerCount: 0
    };
    if (!req.body.question || req.body.question.length < 4) {
      return res.status(400).json({ message: 'Question too short' });
}
    const result = await db.collection('questions').insertOne(newQuestion); // Įterpiu naują klausimą į duomenų bazę
    res.status(201).json({ message: 'Question created',question: newQuestion, id: result.insertedId });
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Gaunu klausimą pagal ID su atsakymais

export const getQuestionById = async (req, res) => {
  try {
    const db = await getDb();
    const question = await db.collection('questions').findOne({ _id: req.params.id }); // Gaunu klausimą pagal ID
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    } 
    // Pridedu vartotojo informaciją, kad būtų galima matyti, kas sukūrė klausimą
    
    const answers = await db.collection('answers')
      .find({ questionId: req.params.id })
      .toArray();
    
    res.status(200).json({ ...question, answers });
  } catch (err) {
    console.error('Error getting question by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Ištrinu klausimą pagal ID ir visus su juo susijusius atsakymus
// Prieš ištrindamas klausimą, taip pat ištrinu visus ats

export const deleteQuestion = async (req, res) => {
  try {
    const db = await getDb();
    const questionId = req.params.id;
    await db.collection('answers').deleteMany({ questionId: questionId }); // Ištrinu visus atsakymus, susijusius su šiuo klausimu
    const result = await db.collection('questions').deleteOne({ _id: req.params.id }); // Ištrinu klausimą pagal ID
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json({ message: 'Question deleted' });
  } catch (err) {
    console.error('Error deleting question:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Atnaujinu klausimą pagal ID, pridedu savininko patikrinimą

export const updateQuestion = async (req, res) => {
  try {
    const db = await getDb();
    const { question: updatedQuestion } = req.body;

    // Randu klausimą, pradedu savininko patikrinimą

    const existingQuestion = await db.collection('questions').findOne({ _id: req.params.id });
    if (!existingQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    // Tikrinu ar vartotojas yra savininkas

    if (existingQuestion.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    // Atnaujinu klausimą

    const result = await db.collection('questions').updateOne(
      { _id: req.params.id },
      { $set: { question: updatedQuestion, updatedAt: new Date().toISOString()}},
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json({ message: 'Question updated' });
  } catch (err) {
    console.error('Error updating question:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Pridedu like ir dislike funkcionalumą klausimams

export const likeQuestion = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user.id;
    
    // Pirmiausia gaunu klausimą

    const question = await db.collection('questions').findOne({ _id: id }); // Naudoju ID, kuris yra unikalus klausimo identifikatorius
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Patikrinu ar vartotojas jau "like"

    const hasLiked = question.likedBy?.includes(userId);
    const hasDisliked = question.dislikedBy?.includes(userId);

    let update = {};

    if (hasLiked) {

      // Pašalinu like

      update = {
        $inc: { likes: -1 },
        $pull: { likedBy: userId }
      };
    } else {

      // Pridedu like

      update = {
        $inc: { likes: 1 },
        $addToSet: { likedBy: userId }
      };
      
      // Pašalinti dislike jei buvo

      if (hasDisliked) {
        update.$inc.dislikes = -1;
        update.$pull = { dislikedBy: userId };
      }
    }

    // Atnaujinu klausimą su like/dislike

    const result = await db.collection('questions').updateOne(
      { _id: id },
      update
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: 'Update failed' });
    }

    res.status(200).json({ message: 'Like updated' });
  } catch (err) {
    console.error('Error liking question:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Išskleidžiu dislike funkcionalumą klausimams

export const dislikeQuestion = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user.id;
    
    // Pirmiausia gauti klausimą

    const question = await db.collection('questions').findOne({ _id: id });
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
     // Patikrinti ar vartotojas jau "like" ar "dislike"

    const hasDisliked = question.dislikedBy?.includes(userId);
    const hasLiked = question.likedBy?.includes(userId);

     let update = {};

    if (hasDisliked) {

      // Pašalinu dislike

      update = {
        $inc: { dislikes: -1 },
        $pull: { dislikedBy: userId }
      };
    } else {

      // Pridedu dislike

      update = {
        $inc: { dislikes: 1 },
        $addToSet: { dislikedBy: userId }
      };
      
      // Pašalinu like jei buvo
      
      if (hasLiked) {
        update.$inc.likes = -1;
        update.$pull = { likedBy: userId };
      }
    }

    // Atnaujinu klausimą su like/dislike

    const result = await db.collection('questions').updateOne(
      { _id: id },
      update
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: 'Update failed' });
    }

    res.status(200).json({ message: 'Dislike updated' });
  } catch (err) {
    console.error('Error disliking question:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
