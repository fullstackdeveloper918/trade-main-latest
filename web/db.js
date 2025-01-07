import mysql from "mysql2";



let db_con = mysql.createConnection({
  host: "srv1331.hstgr.io",
  user: "u448961291_fullstack",
  password: "#9usf4:g1oC",
  database: "u448961291_sellmac_databa",
});

db_con.connect((err) => {
  if (err) {
    console.log("Database Connection Failed !!!", err);
  } else {
    console.log("connected to Database");
  }
});

export default db_con;
