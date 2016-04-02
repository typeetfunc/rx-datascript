import chai from 'chai'
import {datascript as ds, mori, helpers} from 'datascript-mori'
import {connect, nextTx, q$, entity$} from '../src/index'
import 'rxjs/add/operator/skipWhile'
import 'rxjs/add/operator/filter'

const {js: djs, core: dcljs} = ds
const {expect, assert} = chai
const {DB_ID, DB_ADD, TX_DATA, TX_META, DB_AFTER, DB_BEFORE, DB_UNIQUE, DB_UNIQUE_IDENTITY} = helpers
const {hashMap, vector, parse, toJs, equals, isMap, hasKey, isSet, set, get, find, map, nth, filter, count} = mori

const pushObservableToList = (observable$, list) => observable$.subscribe(val => list.push(val))

const db = ds.js.empty_db()
const {report$, tx$} = connect(db)
const response$ = q$(
  report$,
  parse(`[:find ?n ?a :where [?e "name" ?n] [?e "age" ?a]]`)
)
const responseFromBind$ = report$::q$(parse(`[:find ?n ?a :where [?e "name" ?n] [?e "age" ?a]]`))

var reportList = [],
  responseList = [],
  responseFromBindList = [];

pushObservableToList(report$, reportList)
pushObservableToList(response$, responseList)
pushObservableToList(responseFromBind$, responseFromBindList)

nextTx(tx$, vector(
  vector(DB_ADD, 1, "name", "Ivan"),
  vector(DB_ADD, 1, "age", 17)
));

nextTx(tx$, vector(
  hashMap(
    DB_ID, 2,
    "name", "Igor",
    "age", 35
  )
));

describe('report stream', () => {
  it('first report structure ok', () => {
    const firstReport = reportList[0];
    assert(isMap(firstReport), 'is Map');
    assert(
      hasKey(firstReport, DB_AFTER) &&
      hasKey(firstReport, DB_BEFORE) &&
      hasKey(firstReport, TX_DATA),
      'has all keys'
    );
  });
});

describe('query stream', () => {
  it('first query structure ok', () => {
    const firstResponse = responseList[0];
    assert(isSet(firstResponse), 'is set');
    assert(
      equals(
        firstResponse,
        set([vector("Ivan", 17)])
      ),
      'first response ok'
    );
  });
});

describe('call as function and call with bind operator is equals', () => {
  it('all query stream equals', () => {
    const isListEquals = responseList
      .map((val, i) => equals(val, responseFromBindList[i]))
      .reduce((acc, val) => val ? acc : false, true);
    assert(isListEquals, 'responseList equals responseFromBindList')
  })
})


const userDb = dcljs.empty_db(
  hashMap(
    `name`, hashMap(DB_UNIQUE, DB_UNIQUE_IDENTITY)
  )
)
const userConn$ = connect(userDb) // connect is a stream of transactions and stream of reports
const ivanAdultEntity$ = userConn$
  .report$
  ::entity$(vector(`name`, `Ivan`)) // stream of entity
  .skipWhile(Ivan => {
    const ageIvan = get(Ivan, `age`)
    //console.log(ageIvan, Ivan)
    return ageIvan < 18
  }) // skip entity until age < 18
const names$ = userConn$
  .report$
  .filter(report => {
    const txs = get(report, TX_DATA)
    const attrs = map(tx => nth(tx, 1), txs)
    return count(filter(attr => attr === `name`, attrs))
  }) // filter all tx which dont affect names of entities
  ::q$(parse(`[:find [?n ...] :where [?e "name" ?n]]`))

const namesList = [],
  userReportList = [],
  ivanAdultEntityList = [];
pushObservableToList(names$, namesList)
pushObservableToList(ivanAdultEntity$, ivanAdultEntityList)

nextTx(userConn$.tx$, vector(
  vector(DB_ADD, 1, `name`, `Ivan`),
  vector(DB_ADD, 1, `age`, 17)
))

nextTx(userConn$.tx$, vector(
  vector(DB_ADD, 1, `age`, 18)
))
nextTx(userConn$.tx$, vector(
  vector(DB_ADD, 1, `age`, 19)
))
nextTx(userConn$.tx$, vector(
  hashMap(
    DB_ID, 2,
    `name`, `Igor`,
    `age`, 35
  )
));

describe('check entity stream', () => {
  it('contains 2 entity', () => {
    assert(ivanAdultEntityList.length === 3, 'count entities is ok')
  })

  it('all entities with age > 18', () => {
    const countWithLowAge = ivanAdultEntityList
      .map(e => get(e, `age`))
      .filter(age => age < 18)
      .length
    assert(countWithLowAge === 0, 'streams not have entity with age < 18')
  })
})

describe('check filtered query stream', () => {
  it('contains 2 result of query', () => {
    assert(namesList.length === 2, 'count results of query is ok')
  })

  it('first result contains only Ivan', () => {
    assert(equals(namesList[0], vector(`Ivan`)), 'first result is ok')
  })

  it('second result contains Ivan and Igor', () => {
    assert(equals(namesList[1], vector(`Ivan`, `Igor`)), 'second result is ok')
  })
})
