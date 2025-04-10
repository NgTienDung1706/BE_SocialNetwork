// sockets/messageSocket.js
const Message = require('../models/message');
const User = require('../models/user');
const Conversation = require('../models/conversation');
const moment = require('moment-timezone');

const messageSocket = (io) => {
    const onlineUsers = new Map(); // Lưu trữ socket.id của users đang online

    io.on('connection', (socket) => {
        console.log('Message socket connected:', socket.id);

        // Join conversation room
        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${socket.id} joined conversation: ${conversationId}`);
        });

        // Leave conversation room
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(conversationId);
            console.log(`User ${socket.id} left conversation: ${conversationId}`);
        });

        // User online status
        socket.on('user_online', (userId) => {
            onlineUsers.set(userId, socket.id);
            io.emit('user_status', {
                userId: userId,
                status: 'online'
            });
        });

        // Typing indicator
        socket.on('typing', ({ conversationId, userId, isTyping }) => {
            socket.to(conversationId).emit('user_typing', {
                userId,
                isTyping
            });
        });

        // Send new message
        socket.on('send_message', async (messageData) => {
            try {
                const { conversation_id, sender, content, message_type, timestamp } = messageData;
        
                // Tạo tin nhắn mới với thông tin từ client
                const newMessage = await Message.create({
                    conversation_id,
                    sender_id: sender.id, // Lấy ID từ object sender
                    content,
                    message_type,
                    //timestamp: new Date(timestamp), // Chuyển đổi timestamp từ client
                    timestamp: new Date(parseInt(timestamp)),
                });
    
                // await Conversation.findByIdAndUpdate(conversation_id, {
                //     last_message: {
                //         content,
                //         sender_id: sender.id,
                //         timestamp: new Date(parseInt(timestamp)),
                //         message_type,
                //     }
                // });
                const lastMessageContent = message_type === 'image' ? 'Đã gửi một hình ảnh' : content;
                await Conversation.findByIdAndUpdate(conversation_id, {
                last_message: {
                    content: lastMessageContent,
                    sender_id: sender.id,
                timestamp: new Date(parseInt(timestamp)),
                message_type,
                 }
                });

                // Lấy thông tin người gửi từ database
                const senderInfo = await User.findById(sender.id).select('_id username profile.name profile.avatar');
        
                // Gửi tin nhắn mới đến tất cả client trong room
                io.to(conversation_id).emit('new_message', {
                    id: newMessage._id,
                    conversation_id: newMessage.conversation_id,
                    sender_id: {
                        _id: senderInfo._id,
                        username: senderInfo.username,
                        name: senderInfo.profile.name,    
                        avatar: senderInfo.profile.avatar 
                    },
                    content: newMessage.content,
                    message_type: newMessage.message_type,
                    //timestamp: newMessage.timestamp,
                    timestamp: formatTimestamp(newMessage.createdAt),
                    createdAt: newMessage.createdAt
                });
                
        
            } catch (error) {
                console.error('Socket send message error:', error);
                socket.emit('message_error', { 
                    message: 'Lỗi gửi tin nhắn',
                    error: error.message 
                });
            }
        });
        socket.on('mark_read', async ({ conversation_id, user_id }) => {
            try {
                await Message.updateMany(
                    {
                        conversation_id,
                        sender_id: { $ne: user_id },
                        status: { $ne: 'read' }
                    },
                    { status: 'read' }
                );

                io.to(conversation_id).emit('messages_read', {
                    conversation_id,
                    reader_id: user_id
                });
            } catch (error) {
                console.error('Mark read error:', error);
            }
        });
        socket.on('disconnect', () => {
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);
                    io.emit('user_status', {
                        userId: userId,
                        status: 'offline'
                    });
                    break;
                }
            }
            console.log('Message socket disconnected:', socket.id);
        });
    });
};

const formatTimestamp = (date) => {
    return moment(date)
        .tz('Asia/Ho_Chi_Minh')
        .format('HH:mm - DD/MM/YYYY');
};

module.exports = messageSocket;