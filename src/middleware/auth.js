const jwt = require("jsonwebtoken");

const userAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization', 'Bearer ')

    if (!token) {
      return res.status(403).send({
          status: false,
          message: `Missing authentication token in request`,
        });
    }

    let splitToken = token.split(' ')

    const decodeToken = jwt.verify(splitToken[1], "Secret-Key")
    
    if (!decodeToken) {
      return res.status(403).send({
          status: false,
          message: `Invalid authentication token in request`,
        });
    }

    req.userId = decodeToken.userId

    next();
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err.message });
  }
};

module.exports.userAuth = userAuth;