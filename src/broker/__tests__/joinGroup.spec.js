const Broker = require('../index')
const { MemberMetadata } = require('../../consumer/assignerProtocol')
const { secureRandom, createConnection, newLogger, retryProtocol } = require('testHelpers')

describe('Broker > JoinGroup', () => {
  let groupId, topicName, seedBroker, broker

  beforeEach(async () => {
    groupId = `consumer-group-id-${secureRandom()}`
    topicName = `test-topic-${secureRandom()}`
    seedBroker = new Broker({
      connection: createConnection(),
      logger: newLogger(),
    })
    await seedBroker.connect()

    const {
      coordinator: { host, port },
    } = await retryProtocol(
      'GROUP_COORDINATOR_NOT_AVAILABLE',
      async () => await seedBroker.findGroupCoordinator({ groupId })
    )

    broker = new Broker({
      connection: createConnection({ host, port }),
      logger: newLogger(),
    })
    await broker.connect()
  })

  afterEach(async () => {
    await seedBroker.disconnect()
    await broker.disconnect()
  })

  test('request', async () => {
    const response = await broker.joinGroup({
      groupId,
      sessionTimeout: 30000,
      groupProtocols: [
        {
          name: 'AssignerName',
          metadata: MemberMetadata.encode({ version: 1, topics: [topicName] }),
        },
      ],
    })

    expect(response).toEqual({
      errorCode: 0,
      generationId: expect.any(Number),
      groupProtocol: 'AssignerName',
      leaderId: expect.any(String),
      memberId: expect.any(String),
      members: expect.arrayContaining([
        expect.objectContaining({
          memberId: expect.any(String),
          memberMetadata: expect.any(Buffer),
        }),
      ]),
    })
  })
})
