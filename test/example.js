process.env.TESTENV = true

let gemstone = require('../app/models/gemstone.js')
let User = require('../app/models/user')

const crypto = require('crypto')

let chai = require('chai')
let chaiHttp = require('chai-http')
let server = require('../server')
chai.should()

chai.use(chaiHttp)

const token = crypto.randomBytes(16).toString('hex')
let userId
let gemstoneId

describe('gemstones', () => {
  const gemstoneParams = {
    title: '13 JavaScript tricks SEI instructors don\'t want you to know',
    text: 'You won\'believe number 8!'
  }

  before(done => {
    gemstone.deleteMany({})
      .then(() => User.create({
        email: 'caleb',
        hashedPassword: '12345',
        token
      }))
      .then(user => {
        userId = user._id
        return user
      })
      .then(() => gemstone.create(Object.assign(gemstoneParams, {owner: userId})))
      .then(record => {
        gemstoneId = record._id
        done()
      })
      .catch(console.error)
  })

  describe('GET /gemstones', () => {
    it('should get all the gemstones', done => {
      chai.request(server)
        .get('/gemstones')
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.gemstones.should.be.a('array')
          res.body.gemstones.length.should.be.eql(1)
          done()
        })
    })
  })

  describe('GET /gemstones/:id', () => {
    it('should get one gemstone', done => {
      chai.request(server)
        .get('/gemstones/' + gemstoneId)
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.gemstone.should.be.a('object')
          res.body.gemstone.title.should.eql(gemstoneParams.title)
          done()
        })
    })
  })

  describe('DELETE /gemstones/:id', () => {
    let gemstoneId

    before(done => {
      gemstone.create(Object.assign(gemstoneParams, { owner: userId }))
        .then(record => {
          gemstoneId = record._id
          done()
        })
        .catch(console.error)
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .delete('/gemstones/' + gemstoneId)
        .set('Authorization', `Bearer notarealtoken`)
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should be succesful if you own the resource', done => {
      chai.request(server)
        .delete('/gemstones/' + gemstoneId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })

    it('should return 404 if the resource doesn\'t exist', done => {
      chai.request(server)
        .delete('/gemstones/' + gemstoneId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(404)
          done()
        })
    })
  })

  describe('POST /gemstones', () => {
    it('should not POST an gemstone without a title', done => {
      let noTitle = {
        text: 'Untitled',
        owner: 'fakedID'
      }
      chai.request(server)
        .post('/gemstones')
        .set('Authorization', `Bearer ${token}`)
        .send({ gemstone: noTitle })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not POST an gemstone without text', done => {
      let noText = {
        title: 'Not a very good gemstone, is it?',
        owner: 'fakeID'
      }
      chai.request(server)
        .post('/gemstones')
        .set('Authorization', `Bearer ${token}`)
        .send({ gemstone: noText })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not allow a POST from an unauthenticated user', done => {
      chai.request(server)
        .post('/gemstones')
        .send({ gemstone: gemstoneParams })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should POST an gemstone with the correct params', done => {
      let validgemstone = {
        title: 'I ran a shell command. You won\'t believe what happened next!',
        text: 'it was rm -rf / --no-preserve-root'
      }
      chai.request(server)
        .post('/gemstones')
        .set('Authorization', `Bearer ${token}`)
        .send({ gemstone: validgemstone })
        .end((e, res) => {
          res.should.have.status(201)
          res.body.should.be.a('object')
          res.body.should.have.property('gemstone')
          res.body.gemstone.should.have.property('title')
          res.body.gemstone.title.should.eql(validgemstone.title)
          done()
        })
    })
  })

  describe('PATCH /gemstones/:id', () => {
    let gemstoneId

    const fields = {
      title: 'Find out which HTTP status code is your spirit animal',
      text: 'Take this 4 question quiz to find out!'
    }

    before(async function () {
      const record = await gemstone.create(Object.assign(gemstoneParams, { owner: userId }))
      gemstoneId = record._id
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .patch('/gemstones/' + gemstoneId)
        .set('Authorization', `Bearer notarealtoken`)
        .send({ gemstone: fields })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should update fields when PATCHed', done => {
      chai.request(server)
        .patch(`/gemstones/${gemstoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ gemstone: fields })
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })

    it('shows the updated resource when fetched with GET', done => {
      chai.request(server)
        .get(`/gemstones/${gemstoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          res.body.gemstone.title.should.eql(fields.title)
          res.body.gemstone.text.should.eql(fields.text)
          done()
        })
    })

    it('doesn\'t overwrite fields with empty strings', done => {
      chai.request(server)
        .patch(`/gemstones/${gemstoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ gemstone: { text: '' } })
        .then(() => {
          chai.request(server)
            .get(`/gemstones/${gemstoneId}`)
            .set('Authorization', `Bearer ${token}`)
            .end((e, res) => {
              res.should.have.status(200)
              res.body.should.be.a('object')
              // console.log(res.body.gemstone.text)
              res.body.gemstone.title.should.eql(fields.title)
              res.body.gemstone.text.should.eql(fields.text)
              done()
            })
        })
    })
  })
})
