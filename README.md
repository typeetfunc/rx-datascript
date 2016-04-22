Rx-DataScript [![Build Status](https://travis-ci.org/typeetfunc/rx-datascript.svg?branch=master)](https://travis-ci.org/typeetfunc/rx-datascript)
=========================

RxJS wrapper for [DataScript](https://github.com/tonsky/datascript). [DataScript connection](https://github.com/tonsky/datascript/blob/master/test%2Fdatascript%2Ftest%2Fconn.cljc) represented as [reports stream](https://github.com/typeetfunc/rx-datascript/blob/master/src/index.js#L22) and [transactions stream](https://github.com/typeetfunc/rx-datascript/blob/master/src/index.js#L21). Reports stream is formed from transactions stream with using `scan` function.

### Example
```Javascript
import {datascript, mori, helpers} from 'datascript-mori'
import {connect, nextTx, q$, entity$} from '../src/index'
import 'rxjs/add/operator/skipWhile'
import 'rxjs/add/operator/filter'
const {DB_ID, DB_ADD, TX_DATA, TX_META, DB_AFTER, DB_BEFORE, DB_UNIQUE, DB_UNIQUE_IDENTITY} = helpers
const {vector, parse, get, hashMap, map, nth, reduce} = mori
const {js: djs} = datascript
const db = djs.empty_db({name: {[DB_UNIQUE]: DB_UNIQUE_IDENTITY}})
const {report$, tx$} = connect(db) // connect is a stream of transactions and stream of reports
const ivanAdultEntity$ = report$
  ::entity$(vector(`name`, `Ivan`)) // make entity stream
  .skipWhile(
    Ivan => get(Ivan, `age`) < 18
  ) // skip all entity with age < 18
const names$ = report$
  .filter(
    report => find(
      map(report, tx => nth(tx, 2)),
      `name`
    )
  ) // filter all tx which dont affect names of entities
  ::q$(parse(`[:find [?n ...] :where [?e "name" ?n]]`)) // make results of the query stream
// subscribes
names$.subscribe(
  names => console.log(
    `Names of users: ${reduce(names, (acc, name) => acc + ', ' + name)}`
  )
)
ivanAdultEntity$.subscribe(Ivan => console.log(`Ivan age ${get(Ivan, 'age')} years`))
// Add some tx
nextTx(tx$, vector(
  vector(DB_ADD, 1, `name`, `Ivan`),
  vector(DB_ADD, 1, `age`, 17)
))
nextTx(tx$, vector(
  vector(DB_ADD, 1, `age`, 18)
))
nextTx(tx$, vector(
  vector(DB_ADD, 1, `age`, 19)
))
nextTx(tx$, vector(
  hashMap(
    DB_ID, 2,
    "name", "Igor",
    "age", 35
  )
));
/* Output entity subscriber
  Ivan age 18 years
  Ivan age 19 years
*/
/* Output names subscriber
  Names of users: Ivan
  Names of users: Ivan, Igor
*/
```
### API
 - `createAnyQueryStream(queryFunc: Function, distinctUntilChangedFunc: Function): Function`: Basic high order function for wrapping any query function in stream. Second optional argument is function that compare results of query.
 - `connect(db: DataScript DB): {report$: Observable<Report>, tx$: Observable<tx>}`: Function for creating observable of report and tx from DataScript DB.
 - `nextTx(tx$: Observable<tx>, ...tx: Array<tx>)`: Apply array of tx to stream of tx.

###### Reactive analogues DataScript API
 - `q$`
 - `entity$`
 - `filter$`
 - `pull$`
 - `pullMany$`
 - `datoms$`
 - `seekDatoms$`
 - `indexRange$`

All functions takes the first argument observable of reports. Also you can pass observable of reports in `this` with using bind operator - `report$::q$(...)`. Rest arguments is equals list of arguments in original function(see [DataScript Docs](https://github.com/tonsky/datascript/wiki/API-overview))

### Why?

DataScript transaction API based on callbacks. Callbacks is a bad, because using callbacks, you can not work with events as [first-class citizen value](https://en.wikipedia.org/wiki/First-class_citizen).  Reactive streams allow the manipulate events as first-class citizen values and [provide many operators](http://reactivex.io/documentation/operators.html) for proccessing event streams.

### Roadmap
 - Interoperability with other streaming libs(Most, Kefir, etc.)
