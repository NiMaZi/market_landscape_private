import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AuthorSelectService {
 
  private message = new Subject();
  message$ = this.message.asObservable();

  constructor() {

  }

  setState(status:any, selectedAuthor:any) {
    if (selectedAuthor !== null) {
        let nonEmptyPapers = [];
        for (let i = 0; i < selectedAuthor.papers.length; i++){
          if (selectedAuthor.papers[i].title === undefined){
            continue;
          }
          nonEmptyPapers.push(selectedAuthor.papers[i]);
        }
        selectedAuthor.papers = nonEmptyPapers;
    }
    this.message.next({
      status:status,
      selectedAuthor:selectedAuthor,
    });
  }

}
