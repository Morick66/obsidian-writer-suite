import { ItemView, TFolder, Notice, ButtonComponent, TextComponent, Modal, App } from 'obsidian';

// 新建图书
export class NewBookModal extends Modal {
    folder: TFolder;
    view: ItemView;
    refreshCallback: () => void;

    constructor(app: App, folder: TFolder, view: ItemView, refreshCallback: () => void) {
        super(app);
        this.folder = folder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { cls: 'pluginModal', text: '新建书籍' });

        const infoForm = contentEl.createDiv({ cls: 'info-form' });

        const namelabelEl = infoForm.createEl('div', { cls: 'name-label' });
        namelabelEl.createEl('div', { text: '书籍名称', cls: 'input-label' });
        const nameInput = new TextComponent(namelabelEl);
        nameInput.setPlaceholder('在此输入书籍名称');
        
        // 创建书籍类型下拉选择框
        const bookTypeLabel = namelabelEl.createEl('div', { text: "小说类型：", cls: 'option-label' });
        const selectEl = bookTypeLabel.createEl('select', { cls: 'book-type-select' });
        selectEl.id = 'bookType'; // 给 select 元素一个 ID

        // 创建 “长篇小说” 选项并添加到下拉选择框
        const novelOption = selectEl.createEl('option', {
            attr: { value: 'novel', selected: 'selected' } // 初始默认选中长篇小说
        });
        novelOption.textContent = '长篇小说';

        // 创建 “短篇小说” 选项并添加到下拉选择框
        const shortStoryOption = selectEl.createEl('option', { attr: { value: 'short-story' } });
        shortStoryOption.textContent = '短篇小说';

        const desclabelEl = infoForm.createEl('div', { cls: 'desc-label' });
        desclabelEl.createEl('div', { text: '书籍简介', cls: 'input-label' });
        const descInputEl = desclabelEl.createEl('textarea', { cls: 'book-description-textarea' });
        descInputEl.placeholder = '请输入书籍简介';
        descInputEl.rows = 10;
        descInputEl.style.width = '100%';

        // 创建确认按钮
        new ButtonComponent(contentEl)
            .setButtonText('创建')
            .setCta()
            .onClick(async () => {
                const bookName = nameInput.getValue();
                const bookDesc = descInputEl.value;
                let bookType = 'novel';
                const selectedType = document.getElementById('bookType') as HTMLSelectElement;
                bookType = selectedType.value;
                // 验证书籍名称是否为空
                if (bookName.trim() === '') {
                    new Notice('书籍名称不能为空');
                    return;
                }

                const bookFolderPath = `${this.folder.path}/${bookName}`;
                const newFolder = await this.app.vault.createFolder(bookFolderPath);
                if (newFolder) {
                    await this.app.vault.create(newFolder.path + '/信息.md', `---\ntype: ${bookType}\n---\n名称: ${bookName}\n简介: ${bookDesc}`);
                    if (bookType === 'novel') {
                        const novelFolder = await this.app.vault.createFolder(newFolder.path + '/小说文稿');
                        await this.app.vault.create(novelFolder.path + '/未命名章节.md', ''); // 创建空章节
                    } else if (bookType === 'short-story') {
                        await this.app.vault.create(newFolder.path + '/小说正文.md', ''); // 创建空章节
                    }
                }

                new Notice('书籍已创建');
                this.close();
                
            });

        new ButtonComponent(contentEl)
            .setButtonText('取消')
            .onClick(() => {
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}