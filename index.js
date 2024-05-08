const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;


//middlewares
app.use(cors({
    origin: ['http://localhost:5173'], //TODO:for development
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());




//Database Connection
const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
})

//verifyJWT
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })

    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {

        const usersCollection = client.db('reShopDB').collection('users');
        const productsCollection = client.db('reShopDB').collection('products');




        // app.post('/logout', async (req, res) => {
        //     res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        // })


        //JWT & users api
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET
                // , { expiresIn: '5h' }
            );
            res.send({ result, token })
        })


        app.get('/users', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users)
        })



        //get a single user by email
        app.get('/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send(user)
        })


        //get a seller verify status
        app.get('/seller/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send(user)
        })

        //delete user 
        app.delete('/user/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result)
        })


        //********products********

        //get all products 
        app.get('/products', async (req, res) => {
            try {
                const category = req.query.category; // Get category from query parameter
                let products;

                if (category && category !== 'all') {
                    // If category is specified and not 'all', filter products by category
                    products = await productsCollection.find({ productCategory: category }).toArray();
                }
                else {
                    // If category is not specified or 'all', fetch all products
                    products = await productsCollection.find().toArray();
                }

                res.send(products); // Send the filtered/fetched products as JSON response
            } catch (error) {
                console.error('Error fetching products:', error);
                res.status(500).json({ message: 'Server Error' });
            };
        })

        //get single product
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const result = await productsCollection.findOne({ _id: new ObjectId(id) });
            res.send(result)
        })


        //get host homes 
        app.get('/products/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const result = await productsCollection.find({ 'seller.email': email }).toArray();
            res.send(result)
        })




        //add a product
        app.post('/products', verifyJWT, async (req, res) => {
            const productData = req.body;
            const result = await productsCollection.insertOne(productData);
            res.send(result)
        });

        //update a home
        app.put('/product/:id', verifyJWT, async (req, res) => {
            const { id } = req.params;
            const productData = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: productData
            }
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        //delete a product
        app.delete('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result)
        })


        console.log('Database Connected...')
    } finally {
    }
}

run().catch(err => console.error(err))





app.get('/', (req, res) => {
    res.send('Re Shop server running')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})