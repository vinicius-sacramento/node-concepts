const express = require('express')
const { v4: uuidv4 } = require('uuid')

const app = express()

app.use(express.json())

const customers = []

// Middleware
function verifyIfExistsAccountCPF (request, response, next) {
  const { cpf } = request.headers

  const customer = customers.find(customer => customer.cpf === cpf)

  if (!customer) {
    return response.status(400).send({ error: 'Customer not found' })
  }

  request.customer = customer

  return next()
}

function getBalance (statement) {
  let balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount
    } else {
      return acc - operation.amount
    }
  }, 0)
  return balance
}

app.get('/account/all', (request, response) => {
  return response.status(201).send(customers)
})

app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request
  return response.status(201).send(customer)
})

app.post('/account', (request, response) => {
  const { cpf, name } = request.body
  const id = uuidv4()
  const statement = []

  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf)
  if (customerAlreadyExists) {
    return response.status(400).json({ error: 'Customer already exists!' })
  }

  customers.push({ id, cpf, name, statement })

  return response.status(201).send({ id, cpf, name, statement })
})

app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body
  const { customer } = request

  customer.name = name
  return response.status(201).send()
})

app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request

  customers.splice(customer, 1)

  return response.status(201).json(customers)
})

app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request
  return response.json(customer.statement)
})

app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request
  const { date } = request.query

  const dateFormat = new Date(date + ' 00:00')

  const statement = customer.statement.filter(
    statement =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  )

  return response.json(customer.statement)
})

app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body

  const { customer } = request

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  }

  customer.statement.push(statementOperation)

  return response.status(201).send()
})

app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body
  const { customer } = request

  let balance = getBalance(customer.statement)

  if (balance < amount) {
    return response.status(401).send({ error: 'Funds unavaiable' })
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit'
  }

  customer.statement.push(statementOperation)

  return response.status(201).send()
})

app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request

  let balance = getBalance(customer.statement)
  return response.json(balance)
})

app.listen(3333)
