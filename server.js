import express from 'express'
const app = express()
const port = 3000

// Connect to postgre
import { Pool } from 'pg'
const pool = new Pool({
    user: 'postgres',
    password: 'adil',
    host: 'localhost',
    port: 5432,
    database: 'webProfile',
})


app.set('view engine', 'hbs'); //view engin hbs
app.set('views', 'src/views') //file untuk di view ada pada direktori src/vies
app.use('/assets/', express.static('src/assets')) //baca file static lokal 

app.get('/profile', renderProfile)

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})



async function renderProfile(req, res) {
    const result = await pool.query('SELECT * FROM experience');
    const techs = await pool.query('SELECT * FROM techstack');
    const projects = await pool.query('SELECT * FROM myproject');
    // convert date dari tb experience
    const experiences = result.rows.map(exp => {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        const startDate = new Date(exp.startDate);
        const endDate = new Date(exp.endDate);

        const startMonth = months[startDate.getMonth()];
        const startYear = startDate.getFullYear();
        const endMonth = months[endDate.getMonth()];
        const endYear = endDate.getFullYear();
        return {
            ...exp,
            duration: `${startMonth} ${startYear} - ${endMonth} ${endYear}`
        };
    });




    res.render('home', { experiences, techs, projects });
}
