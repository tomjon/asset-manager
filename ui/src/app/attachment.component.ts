import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { DataService } from './data.service';
import { User, BOOK_ROLE, ADMIN_ROLE } from './user';

declare var $;

@Component({
  selector: 'badass-attachment',
  template: `<div class="attachments">
               <h3>
                 Attachments
                 <span class="glyphicon glyphicon-chevron-left" [ngClass]="{disabled: file_index <= 0}" (click)="onNavigate(-1)"></span>
                 <span class="glyphicon glyphicon-chevron-right" [ngClass]="{disabled: file_index >= files.length - 1}" (click)="onNavigate(+1)"></span>
                 <span class="glyphicon glyphicon-th" [ngClass]="{disabled: ! canAttach}" (click)="onThumbnails()" data-toggle="modal" data-target="#thumbnailsModal"></span>
               </h3>
               <div class="attachment" *ngFor="let file of files; let i = index" [hidden]="file_index != i">
                 <img *ngIf="isImage(file.name)" src="{{base_url}}/file/{{file.attachment_id}}" title="{{file.name}}"/>
                 <a *ngIf="! isImage(file.name)" target="attachment" href="/file/{{file.attachment_id}}/{{file.name}}" title="{{file.name}}">{{file.name}}</a>
               </div>
             </div>
             <div id="thumbnailsModal" class="modal fade" role="dialog">
               <div class="modal-dialog thumbnails-dialog">
                 <div class="modal-content">
                   <div class="modal-header">
                     <button type="button" class="close" data-dismiss="modal">&times;</button>
                     <h3 class="modal-title">Attachments</h3>
                   </div>
                   <div class="modal-body">
                     <h4 *ngIf="folder.name != undefined">{{folder.name}}</h4>
                     <div class="folder container" *ngFor="let f of folders">
                       <div class="thumbnail-img" (click)="onFolder(f)">
                         <span class="glyphicon glyphicon-folder-open" title="{{f.name}}"></span>
                       </div>
                       <p>
                         <span *ngIf="rename != f" (click)="onRename(f)">{{f.name}}</span>
                         <input *ngIf="rename == f" type="text" [(ngModel)]="rename.name" (blur)="onRename()"/>
                       </p>
                     </div>
                     <div class="thumbnail container" *ngFor="let file of thumbnails" [ngClass]="{selected: isSelected(file), selectable: isSelectable()}">
                       <div class="thumbnail-img" (click)="onClick(file)">
                         <img *ngIf="isImage(file.name)" src="{{base_url}}/file/{{file.attachment_id}}" title="{{file.name}}"/>
                         <span *ngIf="! isImage(file.name)" class="glyphicon glyphicon-file" title="{{file.name}}"></span>
                       </div>
                       <p>
                         <span *ngIf="rename != file" (click)="onRename(file)">{{file.name}}</span>
                         <input *ngIf="rename == file" type="text" [(ngModel)]="rename.name" (blur)="onRename()"/>
                         <span *ngIf="file.count == 0" class="glyphicon glyphicon-trash" [ngClass]="{disabled: ! canFileOp}" (click)="onDelete($event, file)"></span>
                       </p>
                     </div>
                   </div>
                   <div class="modal-footer">
                     <input #upload type="file" (change)="setFileCount()" [disabled]="! canFileOp"/>
                     <span class="alert alert-danger" *ngIf="conflict && canFileOp" (click)="conflict = false">Your attachment has already been uploaded</span>
                     <button type="button" class="btn btn-default" [ngClass]="{disabled: folder.folder_id == undefined}" (click)="onFolderUp()">Up</button>
                     <button type="button" class="btn btn-default" [ngClass]="{disabled: ! canDoFolder}" (click)="onAddFolder()">New Folder</button>
                     <button type="button" class="btn btn-default" [ngClass]="{disabled: ! canDeleteFolder}" (click)="onDeleteFolder()">Delete Folder</button>
                     <button type="button" class="btn btn-default" [ngClass]="{disabled: ! canAddNew}" (click)="onAddNew()">Upload</button>
                     <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['.attachments { height: 350px }',
           '.attachment img { max-width: 100%; max-height: 100% }',
           '.glyphicon:not(.disabled):not(.glyphicon-file), .selectable { cursor: pointer }',
           '.disabled { color: lightgrey }',
           '.container { display: inline-block; vertical-align: top; margin: 5px; width: 210px; height: 150px }',
           '.thumbnail-img { height: 100px }',
           '.thumbnail-img img { max-width: 200px; max-height: 100px }',
           '.thumbnail-img span { font-size: 80px }',
           '.container p { overflow-wrap: break-word; margin-top: 5px }',
           '.container p .glyphicon { float: right }',
           '.thumbnails-dialog { width: 80% }',
           '.modal-footer input, .modal-footer .alert { float: left; margin-bottom: 0 }',
           '.selected { background: lightblue }',
           '.glyphicon-file { color: grey }',
           '.glyphicon-folder-open { color: brown }']
})
export class AttachmentComponent {
  private files: any[] = [];
  private file_index: number = -1;

  private rename: any;

  // all attachments - not thumbnails, but attachment id, name and reference count
  private folder: any = {};
  private thumbnails: any[] = [];
  private folders: any[] = [];

  private fileCount: number = 0;
  private conflict: boolean = false;

  // base URL for file links
  private base_url: string = window.location.protocol + '//' + window.location.hostname + ":3389";

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

  onRename(item: any=undefined) {
    if (! this.canFileOp) return;
    if (item != undefined) {
      this.rename = item;
    } else {
      if (this.rename.folder_id) {
        this.dataService.renameFolder(this.rename.folder_id, this.rename.name).subscribe();
      } else {
        this.dataService.renameAttachment(this.rename.attachment_id, this.rename.name).subscribe();
      }
      this.rename = undefined;
    }
  }

  get canAttach(): boolean {
    return this.user.role >= BOOK_ROLE;
  }

  get canAddNew(): boolean {
    return this.canFileOp && this.fileCount > 0;
  }

  get canDoFolder(): boolean {
    return this.user.role == ADMIN_ROLE;
  }

  get canFileOp(): boolean {
    return this.user.role == ADMIN_ROLE;
  }

  isSelectable(): boolean {
    return this.asset.id != undefined;
  }

  isSelected(file): boolean {
    return this.files.find(f => f.attachment_id == file.attachment_id) != undefined;
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

  onDelete(event: Event, file) {
    event.stopPropagation();
    this.dataService.deleteAttachment(file.attachment_id)
                    .subscribe(() => {
                      let i = this.thumbnails.indexOf(file);
                      if (i != -1) this.thumbnails.splice(i, 1);
                    });
  }

  get canDeleteFolder(): boolean {
    return this.canDoFolder && (this.thumbnails.length + this.folders.length == 0);
  }

  onFolder(folder: any) {
    folder.parent = this.folder;
    this.folder = folder;
    this.onThumbnails(this.folder.folder_id);
  }

  onFolderUp() {
    this.folder = this.folder.parent;
    this.onThumbnails(this.folder.folder_id);
  }

  onAddFolder() {
    if (! this.canDoFolder) return;
    let name = "Folder";
    this.dataService.addFolder(name, this.folder.folder_id)
                    .subscribe(folder_id => {
                      let folder = {name: name, folder_id: folder_id, parent_id: this.folder.folder_id};
                      this.folders.push(folder);
                    });
  }

  onDeleteFolder() {
    if (! this.canDoFolder) return;
    this.dataService.deleteFolder(this.folder.folder_id)
                    .subscribe(() => this.onFolderUp());
  }

  onThumbnails(folder_id: number) {
    this.dataService.loadAttachments(folder_id)
                    .subscribe(r => {
                      this.folders = r.folders;
                      this.thumbnails = r.files;
                    });
  }

  setFileCount() {
    let inputEl = this.upload.nativeElement;
    this.fileCount = inputEl.files.length;
  }

  onAddNew() {
    let inputEl = this.upload.nativeElement;
    if (inputEl.files.length > 0) {
      let name = inputEl.value;
      let i = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1;
      if (i >= name.length) return;
      name = name.substring(i);
      this.conflict = false;
      this.dataService.uploadAttachment(name, inputEl.files[0], this.folder.folder_id)
                      .subscribe(data => {
                        this.conflict = data.conflict;
                        if (! data.conflict) {
                          data.count = 0;
                          this.thumbnails.push(data);
                        }
                        if (this.asset && this.asset.id != undefined) {
                          let file: any = this.thumbnails.find(file => file.attachment_id == data.attachment_id);
                          if (! this.isSelected(file)) {
                            this.onClick(file); // add association if not already selected
                          }
                        }
                      });
    }
  }

  // add/remove association
  onClick(file: any) {
    if (! this.asset) return;
    if (this.isSelected(file)) {
      this.dataService.removeAssociation(this.asset, file.attachment_id)
                      .subscribe(() => {
                        --file.count;
                        let i = this.files.findIndex(f => f.attachment_id == file.attachment_id);
                        this.files.splice(i, 1);
                        if (i <= this.file_index) --this.file_index;
                      });
    } else {
      this.dataService.addAssociation(this.asset, file.attachment_id)
                      .subscribe(() => {
                        ++file.count;
                        this.files.push(file);
                        if (this.file_index == -1) {
                          this.file_index = 0;
                        }
                      });
    }
  }
}
