import {datascript as ds, mori, reader, keyword } from 'datascript-mori';
import Rx from 'rxjs/Rx'

var { js: dsjs, core: dscljs } = ds;

function T () {
  return true;
}

function createConnStream (scheme) {
  return Rx.Observable.create(observer => {
    var conn = dsjs.create_conn(scheme);
    var db = dsjs.db(conn);
    var firstReport = {
      db_before: db,
      db_after: db,
      tx_data: [],
      tempids: []
    };
    observer.next(firstReport);
    dsjs.listen(conn, "main", report => observer.next(report));
    return () => dsjs.unlisten(conn, "main");
  });
}

function queryStream(conn$, query, sources, checkChange = T) {
  return conn$
    .filter(checkChange)
    .map(({ db_after }) => dscljs.q(reader(query), db_after, ...sources))
    .distinctUntilChanged(mori.equals);

}


export {createConnStream};
