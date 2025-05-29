import express from 'express'
const app = express()
const port = 3000

app.set('view engine', 'hbs'); //view engin hbs
app.set('views', 'src/views') //file untuk di view ada pada direktori src/vies
app.use('/assets/', express.static('src/assets')) //baca file static lokal 

app.get('/', (req, res) => {
    res.render('home')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
