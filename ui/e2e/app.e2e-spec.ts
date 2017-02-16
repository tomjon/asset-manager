import { ExampleApp4Page } from './app.po';

describe('example-app4 App', function() {
  let page: ExampleApp4Page;

  beforeEach(() => {
    page = new ExampleApp4Page();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
