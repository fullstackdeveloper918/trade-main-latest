import mysql from "mysql2";



let db_con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "sellmac",
});

db_con.connect((err) => {
  if (err) {
    console.log("Database Connection Failed !!!", err);
  } else {
    console.log("connected to Database");
  }
});

export default db_con;
