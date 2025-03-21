const express = require('express');
require('dotenv').config();
const initRoutes = require('./routes')
const connectDB = require("./config/MongoDB");
const app = express();

// Sử dụng express.json() để parse JSON body từ client
app.use(express.json());
connectDB();
initRoutes(app)
// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
