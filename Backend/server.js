const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(` Serveur HTTP lancé sur http://localhost:${PORT}`);
});


//----------------------------------------------------------------------------------------------------------------------------------//
 //conexion sur meme resaue
//-------------------------------------------------------------------------------------------------------------------------//
// index.js
//const app = require('./app'); // Importation de l'application Express

// Écoute sur toutes les interfaces réseau, donc accessible depuis d'autres appareils du même réseau
// PORT = process.env.PORT || 5000;

//app.listen(PORT, '0.0.0.0', () => {
 // console.log(` Serveur backend lancé sur http://192.168.0.7:${PORT}`);
//});
   
//----------------------------------------------------------------------------------------------------------------//

// // Mauvais
//fetch("http://localhost:5000/api/...")

// Bon (grâce au proxy)
//fetch("/api/...") // ou tu peux aussi forcer l'IP

