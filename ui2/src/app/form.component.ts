import { Component, OnInit, Input, ContentChildren, QueryList, ViewChild, ElementRef } from '@angular/core';
import { InputComponent } from './input.component';

declare var $: any;

@Component({
  selector: 'bass-form',
  template: ` <div #modal class="modal fade">
                <div class="modal-dialog" role="document">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 *ngIf="title != undefined" class="modal-title">{{title}}</h5>
                      <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                    <div class="modal-body">
                      <ng-content select="bass-input"></ng-content>
                    </div>
                    <div class="modal-footer">
                      <ng-content select="bass-info"></ng-content>
                      <ng-content select="bass-button"></ng-content>
                      <bass-button *ngIf="showSubmitButton != undefined" [disabled]="isPristine || ! isValid" (click)="pristine()" label="Submit"></bass-button>
                      <bass-button *ngIf="showResetButton != undefined" [disabled]="isPristine" (click)="reset()" label="Reset"></bass-button>
                      <bass-button data-dismiss="modal">Close</bass-button>
                    </div>
                  </div>
                </div>
              </div>`,
  styles: ['.modal-content { position: absolute; left: 50%; transform: translate(-50%, 0); min-width: 100% }']
})
export class FormComponent implements OnInit {

  @Input() title: string;

  @Input('submit') showSubmitButton: boolean;
  @Input('reset') showResetButton: boolean;

  @ViewChild('modal') modal: ElementRef;

  @ContentChildren(InputComponent) inputs: QueryList<InputComponent>;

  ngOnInit(): void {
    if (this.title == undefined) throw Error("title input is required");
  }

  get isValid(): boolean {
    if (this.inputs == undefined) return true;
    return this.inputs.filter(input => ! input.isValid).length == 0;
  }

  get isPristine(): boolean {
    if (this.inputs == undefined) return true;
    return this.inputs.filter(input => ! input.isPristine).length == 0;
  }

  pristine(): void {
    this.inputs.forEach(input => input.pristine());
  }

  reset(): void {
    this.inputs.forEach(input => input.reset());
  }

  show(): void {
    $(this.modal.nativeElement).modal('show');
  }

  hide(): void {
    $(this.modal.nativeElement).modal('hide');
  }

}
