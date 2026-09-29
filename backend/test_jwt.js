const jwt = require('jsonwebtoken');
console.log(jwt.sign({ id: 1 }, 'secret'));
