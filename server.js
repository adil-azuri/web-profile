import express from 'express';
import hbs from 'hbs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import flash from 'express-flash';
import session from 'express-session';
import multer from 'multer';

// ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up multer dan save files ke folder 'upload'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/assets/uploads')// Direktori penyimpanan file yg di upload
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '_' + file.originalname); // Menggunakan nama asli file
    }
});

const upload = multer({ storage: storage });


const app = express();
const port = 3000;

// Connect to PostgreSQL
const pool = new Pool({
    user: 'postgres',
    password: 'adil',
    host: 'localhost',
    port: 5432,
    database: 'webProfile',
});

//middleware
app.use(express.urlencoded({ extended: true }));
app.use('/assets/', express.static('src/assets')); // Server static files seperti css js
app.use(flash()) //mengirim pesan eror dengan flash
app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: true,
}))

app.set('view engine', 'hbs'); // Set view engine ke hbs
app.set('views', 'src/views'); // Set views directory
app.use(express.urlencoded({ extended: false }));

// Register partials
hbs.registerPartials(path.join(__dirname, 'src/views/partials'));


//==========================endpoint===============================
app.get('/home', renderProfile); //render home profile

//======register================
app.get('/register', register);
app.post('/register', handleRegister);

//=========Login and dashboard================
app.get('/login', login);
app.post('/login', handleLogin);
app.get('/logout', logout);
app.get('/dashboard', dashboard);

//=========Tech Form================
app.get('/techs', rendertechs);
app.post('/techs', upload.single('techsPic'), handleTechs);
app.post('/deleteTech', deleteTechs);

//=========Experience Form================
app.get('/experience', experience);
app.post('/experience', upload.single('expPicture'), handleExp);
app.post('/deleteExp', deleteExp);
//update
app.get('/update_exp/:id', renderUpdateExp);
app.post('/update_exp/:id', upload.single('expPicture'), UpdateExp);

//=========My Projects Form================
app.get('/myprojects', projects);
app.post('/myprojects', upload.single('projectPicture'), handleProjects);
app.post('/deleteproject', deleteporject);

app.get('/update_projects/:id', UpdateProjects);
app.post('/update_projects/:id', upload.single('projectPicture'), UpdateMyprojects);
//========================================

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});




//=====================================home===========================================================
//render home
async function renderProfile(req, res) {
    const exp = await pool.query('SELECT * FROM experience');
    const techs = await pool.query('SELECT * FROM techstack');
    const projects = await pool.query('SELECT * FROM myproject');

    // Convert date from experience table
    const experiences = exp.rows.map(exp => {
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


//=======================================register=====================================================
//render register
function register(req, res) {
    res.render('register', { message: req.flash('error') })
}

//insert data user 
async function handleRegister(req, res) {
    let { name, email, password } = req.body

    //cek email sudah terdaftar atau belum
    const isRegistered = await pool.query(`SELECT * FROM public.user WHERE email='${email}'`)

    if (isRegistered) {
        req.flash("error", "Email Sudah Terdaftar")
        return res.redirect("/register")
    }

    //hash password
    const hashPassword = await bcrypt.hash(password, 10)

    await pool.query(`INSERT INTO public.user (name, email, password) VALUES ('${name}', '${email}', '${hashPassword}')`)
    res.redirect('/login');
}


//=======================================login=====================================================
//render login
function login(req, res) {
    res.render('login', { message: req.flash('error') })
}

//login form
async function handleLogin(req, res) {
    let { email, password } = req.body
    const isRegistered = await pool.query(
        `SELECT * FROM public.user WHERE email='${email}'`);

    const isMatch = await bcrypt.compare(password, isRegistered.rows[0].password)

    // jika password tidak cocok maka redirect ke login
    if (!isMatch) {
        req.flash("error", "passowrd salah")
        return res.redirect("/login")
    }

    // simpan sesi saat sudah login
    req.session.user = {
        name: isRegistered.rows[0].name,
        email: isRegistered.rows[0].email
    };

    res.redirect("/dashboard");
}

function logout(req, res) {
    req.session.destroy()
    res.redirect('/home')
}


//=======================================Form input=====================================================
//render daSHBOARD
function dashboard(req, res) {
    let userData;
    if (req.session.user) {
        userData = {
            name: req.session.user.name,
            email: req.session.user.email
        }
    }
    res.render('dashboard', { userData })
}


//==================================== tech form===============================
async function rendertechs(req, res) {
    const techs = await pool.query('SELECT * FROM techstack');

    res.render('techs', { techs })
}


//insert to table techs
async function handleTechs(req, res) {
    const nametechs = req.body.nametechs;

    // set file direktori akan di push ke db
    const imgsrc = req.file.filename


    // Insert tech
    await pool.query(`INSERT INTO public.techstack("nameTech", imgsrc) VALUES ($1, $2)`, [nametechs, imgsrc]);

    res.redirect('/techs');
}

async function deleteTechs(req, res) {
    const { id } = req.body;
    await pool.query('DELETE FROM techstack WHERE id=$1', [id]);
    res.redirect('/techs')
}
//==============================================================================================================
//===================================Experience Form======================================
async function experience(req, res) {
    const exp = await pool.query('SELECT * FROM experience');

    // Convert date from experience table
    const experiences = exp.rows.map(exp => {
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

    res.render('experience', { experiences })
}

// input experience
async function handleExp(req, res) {
    const { title, company, startDate, endDate, jobdesk, tech } = req.body;
    const imgsrc = req.file.filename

    await pool.query(`
        INSERT INTO public.experience("namePosition", company, "startDate", "endDate", jobdesk, tech, imgsrc)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`, [title, company, startDate, endDate, jobdesk, tech, imgsrc]);

    res.redirect('/experience');
}

//delete experience
async function deleteExp(req, res) {
    const { id } = req.body;

    await pool.query(`DELETE FROM experience WHERE id=${id}`);
    res.redirect('/experience')
}

async function renderUpdateExp(req, res) {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM public.experience WHERE id = $1', [id]);
    let data = {
        id: result.rows[0].id,
        position: result.rows[0].namePosition,
        company: result.rows[0].company,
        start: result.rows[0].startDate,
        end: result.rows[0].endDate,
        jobdesk: result.rows[0].jobdesk,
        tech: result.rows[0].tech,
        imgsrc: result.rows[0].imgsrc
    };

    res.render('update_exp', { data })
}

async function UpdateExp(req, res) {
    let { title, company, startDate, endDate, jobdesk, tech, id } = req.body;

    const imgsrc = req.file.filename

    await pool.query(`
            UPDATE public.experience
            SET "namePosition" = $1, company = $2, "startDate" = $3, "endDate" = $4, jobdesk = $5, tech = $6, imgsrc = $7
            WHERE id = $8;
        `, [title, company, startDate, endDate, jobdesk, tech, imgsrc, id]);

    res.redirect('/experience')
}
//========================================================================================

//==================================== my project form====================================
async function projects(req, res) {
    const projects = await pool.query('SELECT * FROM myproject');
    res.render("myprojects", { projects })
}

async function handleProjects(req, res) {
    const { title, description, tech } = req.body;
    const imgsrc = req.file.filename


    await pool.query(`
        INSERT INTO public.myproject( projectsrc, "projectTitle", description, techs)
	VALUES ($1, $2, $3, $4)`, [imgsrc, title, description, tech,]);

    res.redirect('/myprojects');
}


async function deleteporject(req, res) {
    const { id } = req.body;

    await pool.query(`DELETE FROM myproject WHERE id=${id}`);
    res.redirect('/myprojects')
}


async function UpdateProjects(req, res) {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM public.myproject WHERE id = $1', [id]);

    let data = {
        id: result.rows[0].id,
        imgsrc: result.rows[0].projectsrc,
        projectTitle: result.rows[0].projectTitle,
        description: result.rows[0].description,
        tech: result.rows[0].techs,
    };

    res.render('update_project', { data })
}


async function UpdateMyprojects(req, res) {
    let { id, title, description, tech } = req.body;

    const imgsrc = req.file.filename

    await pool.query(`UPDATE public.myproject SET projectsrc=$1, "projectTitle"=$2, description=$3, techs=$4 WHERE id=$5`,
        [imgsrc, title, description, tech, id]);

    res.redirect('/myprojects')
}