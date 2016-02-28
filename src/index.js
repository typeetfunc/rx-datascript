import {datascript as ds, mori, helpers} from 'datascript-mori'
import {Subject} from 'rxjs/Subject'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/distinctUntilChanged'

const {core: dscljs} = ds
const {hashMap, vector, get, equals} = mori
const {DB_AFTER, DB_BEFORE, TX_DATA, TX_META} = helpers

function applyTx(db, tx) {
  return dscljs.with$(db, ...tx)
}

function emptyDbReport(db) {
  return hashMap(
    DB_AFTER, db,
    DB_BEFORE, db,
    TX_DATA, vector(),
    TX_META, `INITIAL`
  )
}

export function nextTx(tx$, ...tx) {
  tx$.next(tx)
}

export function createTxStream() {
  return new Subject()
}

export function createReportStream(db, tx$) {
  return tx$.scan(
    (report, tx) => applyTx(get(report, DB_AFTER), tx),
    emptyDbReport(db)
  )
}

export function createAnyQueryStream(reportOrDb$, queryFunc) {
  return reportOrDb$
    .map(reportOrDb => queryFunc(
      dscljs.db_QMARK_(reportOrDb) ? reportOrDb : get(reportOrDb, DB_AFTER)
    ))
    .distinctUntilChanged(equals)
}

export function createQueryStream(reportOrDb$, query, ...sources) {
  return createAnyQueryStream(
    reportOrDb$,
    db => dscljs.q(query, db, ...sources)
  )
}

export function createEntityStream(reportOrDb$, eid) {
  return createAnyQueryStream(
    reportOrDb$,
    db => dscljs.entity(db, eid)
  )
}

export function createPullStream(reportOrDb$, selector, eid) {
  return createAnyQueryStream(
    reportOrDb$,
    db => dscljs.pull(db, selector, eid)
  )
}

export function createPullManyStream(reportOrDb$, selector, eids) {
  return createAnyQueryStream(
    reportOrDb$,
    db => dscljs.pull_many(db, selector, eids)
  )
}

export function createFilterStream(reportOrDb$, filterFunc) {
  return createAnyQueryStream(
    reportOrDb$,
    db => dscljs.filter(db, filterFunc)
  )
}

export function createDatomsStream(reportOrDb$, ...args) {
  return createAnyQueryStream(
    reportOrDb$,
    db => dscljs.datoms(db, ...args)
  )
}

export function createSeekDatomsStream(reportOrDb$, ...args) {
  return createAnyQueryStream(
    reportOrDb$,
    db => dscljs.seek_datoms(db, ...args)
  )
}

export function createIndexRangeStream(reportOrDb$, ...args) {
  return createAnyQueryStream(
    reportOrDb$,
    db => dscljs.index_range(db, ...args)
  )
}
