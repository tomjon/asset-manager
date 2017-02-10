import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { DataService } from './data.service';
import { User, BOOK_ROLE } from './user';

declare var $;

@Component({
  selector: 'badass-attachment',
  template: `<div class="attachments">
               <h3>
                 Attachments
                 <span class="glyphicon glyphicon-chevron-left" [ngClass]="{disabled: file_index <= 0}" (click)="onNavigate(-1)"></span>
                 <span class="glyphicon glyphicon-chevron-right" [ngClass]="{disabled: file_index >= files.length - 1}" (click)="onNavigate(+1)"></span>
                 <span class="glyphicon glyphicon-th" [ngClass]="{disabled: ! canUpload()}" (click)="onThumbnails()" data-toggle="modal" data-target="#thumbnailsModal"></span>
               </h3>
               <div class="attachment" *ngFor="let file of files; let i = index" [hidden]="file_index != i">
                 <img *ngIf="isImage(file.name)" src="/file/{{file.attachment_id}}" title="{{file.name}}"/>
                 <a *ngIf="! isImage(file.name)" target="attachment" href="/file/{{file.attachment_id}}/{{file.name}}" title="{{file.name}}">{{file.name}}</a>
               </div>
             </div>
             <div id="thumbnailsModal" class="modal fade" role="dialog">
               <div class="modal-dialog thumbnails-dialog">
                 <div class="modal-content">
                   <div class="modal-header">
                     <button type="button" class="close" data-dismiss="modal">&times;</button>
                     <h4 class="modal-title">Attachments</h4>
                   </div>
                   <div class="modal-body">
                     <div class="thumbnail container" *ngFor="let file of thumbnails" (click)="onClick(file)" [ngClass]="{selected: isSelected(file), selectable: isSelectable()}">
                       <div class="thumbnail-img">
                         <img *ngIf="isImage(file.name)" src="/file/{{file.attachment_id}}" title="{{file.name}}"/>
                         <span *ngIf="! isImage(file.name)" class="glyphicon glyphicon-file" title="{{file.name}}"></span>
                       </div>
                       <p>
                         {{file.name}} {{file.count}}
                         <span *ngIf="file.count == 0" class="glyphicon glyphicon-trash" [ngClass]="{disabled: ! canUpload()}" (click)="onDelete(file)"></span>
                       </p>
                     </div>
                   </div>
                   <div class="modal-footer">
                     <input #upload type="file"/>
                     <button type="button" class="btn btn-default" (click)="onAddNew()">Add New</button>
                     <button type="button" class="btn btn-default" data-dismiss="modal">Dismiss</button>
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['.attachments { height: 350px }',
           '.attachment img { max-width: 100%; max-height: 100% }',
           '.glyphicon:not(.disabled), .selectable { cursor: pointer }',
           '.disabled { color: lightgrey }',
           '.container { display: inline-block; vertical-align: top; margin: 5px; width: 210px; height: 150px }',
           '.thumbnail-img { height: 100px }',
           '.thumbnail-img img { max-width: 200px; max-height: 100px }',
           '.thumbnail-img span { font-size: 80px }',
           '.container p { overflow-wrap: break-word; margin-top: 5px }',
           '.container p span { float: right }',
           '.thumbnails-dialog { width: 80% }',
           '.modal-footer input { float: left }',
           '.selected { border-color: lightblue }']
})
export class AttachmentComponent {
  private files: any[] = [];
  private file_index: number = -1;

  // all attachments - not thumbnails, but attachment id, name and reference count
  private thumbnails: any[] = [];

  // attachment look up for the asset (if any) from attachment_id to name
  private attachments: any = {};

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

  isSelectable(): boolean {
    return this.asset.id != undefined;
  }

  isSelected(file): boolean {
    return file.attachment_id in this.attachments;
  }

  isImage(src): boolean {
    if (! src) return false;
    src = src.toLowerCase();
    for (let ext of ['.jpg', '.jpeg', '.gif', '.png', '.bmp']) {
      if (src.endsWith(ext)) return true;
    }
    return false;
  }

  onNavigate(delta: number) {
    if (this.files.length == 0) return;
    this.file_index += delta;
    this.file_index = Math.max(0, this.file_index);
    this.file_index = Math.min(this.files.length - 1, this.file_index);
  }

  onDelete(file) {
    this.dataService.deleteAttachment(file.attachment_id)
                    .subscribe(() => {
                      let i = this.thumbnails.indexOf(file);
                      if (i != -1) this.thumbnails.splice(i, 1);
                    });
  }

  onThumbnails() {
    this.dataService.loadAttachments()
                    .subscribe(files => this.thumbnails = files);
    this.attachments = {};
    if (this.asset) {
      this.dataService.loadAssociations(this.asset)
                      .subscribe(attachments => {
                        for (let attachment of attachments) {
                          this.attachments[attachment.attachment_id] = attachment.name;
                        }
                      });
    }
  }

  onAddNew() {
    let inputEl = this.upload.nativeElement;
    if (inputEl.files.length > 0) {
      let name = inputEl.value;
      let i = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1;
      if (i >= name.length) return;
      name = name.substring(i);
      this.dataService.uploadAttachment(name, inputEl.files[0])
                      .subscribe(data => {
                        if (! data.conflict) {
                          this.thumbnails.push(data);
                        }
                        if (this.asset) {
                          let file: any = {}; //FIXME find file by attachment_id in this.thumbnails
                          if (! (file.attachment_id in this.attachments)) {
                            this.onClick(file);
                          }
                        }
                      });
    }
  }

  // add/remove association
  onClick(file: any) {
    if (! this.asset) return;
    if (file.attachment_id in this.attachments) {
      this.dataService.removeAssociation(this.asset, file.attachment_id)
                      .subscribe(() => {
                        --file.count;
                        delete this.attachments[file.attachment_id];
                      });
    } else {
      this.dataService.addAssociation(this.asset, file.attachment_id)
                      .subscribe(() => {
                        ++file.count;
                        this.attachments[file.attachment_id] = file.name;
                      });
    }
  }
}
