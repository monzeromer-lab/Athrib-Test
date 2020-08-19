const express = require('express');
const UsersRouter = express.Router();
const bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');
var cors = require('cors');
const uuid = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../config/db.js');
const userMiddleware = require('../middleware/users.js');
var multer = require('multer');
var path = require('path');

UsersRouter.use(bodyParser.urlencoded({ extended: false }));
UsersRouter.use(bodyParser.json());
UsersRouter.use(cors());

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null,'./public/image/uploads')
  },
  filename: (req, file, cb) => {
    cb(null,'IMG-' + Date.now() + path.extname(file.originalname))
  }
});
var upload = multer({storage: storage});

UsersRouter.get('/userstest' , (req , res , next)=>{
    res.status=200;
    res.setHeader('Content-Type' , 'application/json');
    res.json({ hi: "hello world!" })
    });

    UsersRouter.post('/sign-up', upload.single('profile'), userMiddleware.validateRegister,  (req, res, next) => {
            db.query(`SELECT * FROM users WHERE LOWER(username) = LOWER(${db.escape(req.body.username)});`,(err, result) => {
                if (result.length) {
                  return res.status(409).send({
                    msg: 'This username is already in use!'
                  });
                } else {
                  // username is available
                  bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                      return res.status(500).send({
                        msg: err
                      });
                    } else {
                      if (!req.file) {
                        console.log("No file received");
                      } else {
                        console.log('file received');
                      }

                      // has hashed pw => add to database
                      db.query(`INSERT INTO users ( username, password, profile_pic, registered) VALUES ( ${db.escape(req.body.username)}, ${db.escape(hash)},${db.escape(req.file.filename)}, now())`,(err, result) => {
                          if (err) {
                            throw err;
                            return res.status(400).send({
                              msg: err
                            });
                          }
                          return res.status(201).send({
                            msg: 'Registered!'
                          });
                        }
                      );
                    }
                  });
                }
              }
            );
          });
    
    UsersRouter.post('/login', (req, res, next) => {
        db.query(`SELECT * FROM users WHERE username = ${db.escape(req.body.username)};`,(err, result) => {
              // user does not exists
              if (err) {
                throw err;
                return res.status(400).send({
                  msg: err
                });
              }
              if (!result.length) {
                return res.status(401).send({
                  msg: 'Username or password is incorrect!'
                });
              }
              // check password
              bcrypt.compare(req.body.password,result[0]['password'],(bErr, bResult) => {
                  // wrong password
                  if (bErr) {
                    throw bErr;
                    return res.status(401).send({
                      msg: 'Username or password is incorrect!'
                    });
                  }
                  if (bResult) {
                    const token = jwt.sign({
                        username: result[0].username,
                        userId: result[0].id
                      },
                      'SECRETKEY', {
                        expiresIn: '7 days'
                      }
                    );
                    db.query(`UPDATE users SET last_login = now() WHERE id = '${result[0].id}'`);
                    return res.status(200).send({
                      msg: 'Logged in!',
                      token,
                      user: result[0]
                    });
                  }
                  return res.status(401).send({
                    msg: 'Username or password is incorrect!'
                  });
                }
              );
            }
          );
    });
    
    UsersRouter.get('/secret-route', userMiddleware.isLoggedIn , (req, res, next) => {
      res.send('This is the secret content. Only logged in users can see that!');
    });

    module.exports = UsersRouter;