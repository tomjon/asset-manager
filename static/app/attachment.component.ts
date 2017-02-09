import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { DataService } from './data.service';
import { User, BOOK_ROLE } from './user';

declare var $;

@Component({
  selector: 'badass-attachment',
  template: `<div class="attachments">
               <h3>
                 Attachments
                 <span class="glyphicon glyphicon-chevron-left" [ngClass]="{disabled: file_index <= 0}" (click)="onImgClick(-1)"></span>
                 <span class="glyphicon glyphicon-chevron-right" [ngClass]="{disabled: file_index >= files.length - 1}" (click)="onImgClick(+1)"></span>
                 <span class="glyphicon glyphicon-trash" [ngClass]="{disabled: file_index == -1}" (click)="onImgDelete()"></span>
                 <span class="glyphicon glyphicon-plus-sign" [ngClass]="{disabled: ! canUpload()}" (click)="onThumbnails()" data-toggle="modal" data-target="#thumbnailsModal"></span>
               </h3>
               <div class="attachment" *ngFor="let file of files; let i = index" [hidden]="file_index != i">
                 <img *ngIf="isImage(file.name)" src="/file/{{file.attachment_id}}"/>
                 <a *ngIf="! isImage(file.name)" target="attachment" href="/file/{{file.attachment_id}}/{{file.name}}">{{file.name}}</a>
               </div>
             </div>
             <div id="thumbnailsModal" class="modal fade" role="dialog">
               <div class="modal-dialog">
                 <div class="modal-content">
                   <div class="modal-header">
                     <button type="button" class="close" data-dismiss="modal">&times;</button>
                     <h4 class="modal-title">Attachments</h4>
                   </div>
                   <div class="modal-body">
                     <div class="thumbnails" *ngFor="let file of thumbnails">
                       <img *ngIf="isImage(file.name)" src="/file/{{file.attachment_id}}"/>
                       <a *ngIf="! isImage(file.name)" target="attachment" href="/file/{{file.attachment_id}}/{{file.name}}">{{file.name}}</a>
                     </div>
                     <input #upload type="file" (change)="onUpload()"/>
                   </div>
                   <div class="modal-footer">
                     <button type="button" class="btn btn-default" (click)="onAddNew()">Add New</button>
                     <button type="button" class="btn btn-default" data-dismiss="modal">Dismiss</button>
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['.attachments { height: 350px }',
           '.attachment img { max-width: 100%; max-height: 100% }',
           '.glyphicon:not(.disabled) { cursor: pointer }',
           '.disabled { color: lightgrey }',
           '.thumbnails img { width: 50px; float: left }']
})
export class AttachmentComponent {
  private files: any[] = [];
  private file_index: number = -1;

  private thumbnails: any[] = [];

  asset: any;
  @Input('asset') set _asset(asset: any) {
    this.asset = asset;
    this.file_index = -1;
    this.files = [];
    if (this.asset.id) {
      this.dataService.getAttachments(this.asset)
                      .subscribe(files => {
                        this.files = files;
                        this.file_index = this.files.length > 0 ? 0 : -1;
                      });
    }
  }

  @Input('user') user: User;

  @ViewChild('upload') upload: ElementRef;

  constructor(private dataService: DataService) {}

  canUpload(): boolean {
    return this.user.role >= BOOK_ROLE;
  }

  isImage(src): boolean {
    src = src.toLowerCase();
    for (let ext of ['.jpg', '.jpeg', '.gif', '.png', '.bmp']) {
      if (src.endsWith(ext)) return true;
    }
    return false;
  }

  onImgClick(delta: number) {
    if (this.files.length == 0) return;
    this.file_index += delta;
    this.file_index = Math.max(0, this.file_index);
    this.file_index = Math.min(this.files.length - 1, this.file_index);
  }

  onImgDelete() {
    this.dataService.removeAssociation(this.asset, this.files[this.file_index].attachment_id)
                    .subscribe(() => {
                      this.dataService.deleteAttachment(this.files[this.file_index].attachment_id)
                                      .subscribe(() => {
                                        --this.file_index;
                                        //this.files = this.files.splice(0, this.files.length - 1);
                                        this.files.pop();
                                      });
                    });
  }

  onThumbnails() {
    this.dataService.loadAttachments()
                    .subscribe(files => this.thumbnails = files);
  }

  onUpload() {
    let inputEl = this.upload.nativeElement;
    if (inputEl.files.length > 0) {
      let name = inputEl.value;
      let i = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1;
      if (i >= name.length) return;
      name = name.substring(i);
      this.dataService.uploadAttachment(name, inputEl.files[0])
                      .subscribe(data => {
                        this.files.push(data);
                        this.file_index = this.files.length - 1;
                        this.dataService.addAssociation(this.asset, data.attachment_id)
                                        .subscribe();
                      });
    }
  }
}
