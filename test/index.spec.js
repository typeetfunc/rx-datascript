import chai from 'chai'
import {datascript as ds, mori, helpers} from 'datascript-mori'
import {connect, nextTx, q$} from '../src/index'

const {expect, assert} = chai
const {DB_ID, DB_ADD, TX_DATA, TX_META, DB_AFTER, DB_BEFORE} = helpers
const {hashMap, vector, parse, toJs, equals, isMap, hasKey, isSet, set} = mori

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

report$.subscribe(val => reportList.push(val))
response$.subscribe(val => responseList.push(val))
responseFromBind$.subscribe(val => responseFromBindList.push(val))

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
