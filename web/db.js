import mysql from "mysql2";

let db_con = mysql.createPool({
  host: "srv1331.hstgr.io",
  user: "u448961291_fullstack",
  password: "#9usf4:g1oC",
  database: "u448961291_sellmac_databa",
  waitForConnections: true,
  connectionLimit: 10, // Maximum connections in the pool
  queueLimit: 0, // Unlimited queue requests
});

db_con.getConnection((err, connection) => {
  if (err) {
    console.log("Database Connection Failed !!!", err);
  } else {
    console.log("connected to Database");
    connection.release(); // Release the connection back to the pool
  }
});

export default db_con;
