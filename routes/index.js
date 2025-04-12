const userRouter = require('./user')
const conversationRouter = require('./conversation')
const messageRouter = require('./message')
const postRouter = require('./postRoute')
const initRoutes = (app) => {
    app.use('/api', userRouter)
    app.use('/api', conversationRouter)
    app.use('/api/message', messageRouter)
    app.use('/api/post', postRouter)
}

module.exports = initRoutes