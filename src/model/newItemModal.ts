import { ItemView, TFolder, Notice, Modal, TextComponent, ButtonComponent, App} from 'obsidian';

// 新建条目模态框
export class NewItemModal extends Modal {
    folder: TFolder;
    view: ItemView;

    constructor(app: App, folder: TFolder, view: ItemView, refreshCallback: () => void) {
        super(app);
        this.folder = folder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('p', { text: '新建卷/章节', cls: 'modal-title' });

        const nameInput = new TextComponent(contentEl);
        nameInput.setPlaceholder('输入卷/章节名称...');

        const createFolderButton = new ButtonComponent(contentEl);
        createFolderButton.setButtonText('新卷')
            .onClick(async () => {
                const name = nameInput.getValue();
                if (name) {
                    await this.app.vault.createFolder(`${this.folder.path}/${name}`);
                    new Notice(`Folder '${name}' created.`);
                    this.close();
                }
            });

        const createFileButton = new ButtonComponent(contentEl);
        createFileButton.setButtonText('新章节')
            .onClick(async () => {
                const name = nameInput.getValue();
                if (name) {
                    const filePath = `${this.folder.path}/${name}.md`;
                    await this.app.vault.create(filePath, '');
                    new Notice(`File '${name}.md' created.`);
                    this.close();
                }
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}