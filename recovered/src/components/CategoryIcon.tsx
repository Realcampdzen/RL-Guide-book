export const getCategoryIcon = (categoryId: string): string | JSX.Element => {
  switch (categoryId) {
    case '12':
      return <img src="/RL-Guide-book/category_12.png" alt="Категория 12" />;
    case '13':
      return <img className="category-13-icon" src="/RL-Guide-book/category_13.png" alt="Категория 13" />;
    case '2':
      return <img className="category-2-icon" src="/RL-Guide-book/category_2.png" alt="Категория 2" />;
    case '3':
      return <img className="category-3-icon" src="/RL-Guide-book/category_3.png" alt="Категория 3" />;
    case '8':
      return <img className="category-8-icon" src="/RL-Guide-book/category_8.png" alt="Категория 8" />;
    case '9':
      return <img className="category-9-icon" src="/RL-Guide-book/category_9.png" alt="Категория 9" />;
    case '1':
      return <img src="/RL-Guide-book/category_1.png" alt="Категория 1" />;
    case '7':
      return <img className="category-7-icon" src="/RL-Guide-book/category_7.png" alt="Категория 7" />;
    case '6':
      return <img className="category-6-icon" src="/RL-Guide-book/category_6.png" alt="Категория 6" />;
    case '10':
      return <img className="category-10-icon" src="/RL-Guide-book/category_10.png" alt="Категория 10" />;
    case '11':
      return <img className="category-11-icon" src="/RL-Guide-book/category_11.png" alt="Категория 11" />;
    case '5':
      return <img className="category-5-icon" src="/RL-Guide-book/category_5.png" alt="Категория 5" />;
    case '4':
      return <img className="category-4-icon" src="/RL-Guide-book/category_4.png" alt="Категория 4" />;
    case '14':
      return <img className="category-14-icon" src="/RL-Guide-book/category_14.png" alt="Категория 14" />;
    default:
      return '??';
  }
};

export default getCategoryIcon;
